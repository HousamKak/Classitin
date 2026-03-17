# Mobile Build: Lessons Learned & CI/CD Pipeline Plan

## Part 1 — Lessons Learned (pnpm + Expo + React Native Monorepo)

Every issue below stems from one root cause: **pnpm's strict dependency isolation breaks assumptions** that Expo, Metro, React Native CLI, and Gradle plugins make about flat `node_modules`. In a yarn/npm world, transitive dependencies are hoisted and globally visible. In pnpm, they're symlinked into isolated `.pnpm` stores and only accessible to the package that declares them.

---

### Issue 1: Metro entry file resolves from monorepo root

**Symptom:**
```
Error: Unable to resolve module ./index.js from D:\dev\Classitin/.
```

**Root cause:**
Metro computes an internal `rootDir` as the lowest common ancestor of `config.projectRoot` and all `config.watchFolders`. When `watchFolders` includes the monorepo root (required for shared packages), `rootDir` becomes the monorepo root. The Gradle plugin passes `--entry-file index.js` (relative), and Metro tries to resolve it from `rootDir` — the monorepo root — where no `index.js` exists.

**Fix — `android/app/build.gradle`:**
```groovy
react {
    // ...
    extraPackagerArgs = ["--entry-file", file("${projectRoot}/index.js").absolutePath]
    // ...
}
```

Also set in `metro.config.js` (defense-in-depth):
```javascript
config.projectRoot = projectRoot;
```

**Why this works:** `extraPackagerArgs` appends a second `--entry-file` with the absolute path. The CLI parser (yargs) takes the last occurrence, so the absolute path wins over the relative one. Metro then resolves the absolute path directly without consulting `rootDir`.

**Rule:** In any monorepo where `watchFolders` points outside the app, always pass an absolute `--entry-file` via `extraPackagerArgs`.

---

### Issue 2: `expo-asset` not found during Gradle JS bundling

**Symptom:**
```
Error: The required package `expo-asset` cannot be found
```

**Root cause:**
`expo-asset` is a transitive dependency of `expo` / `@expo/metro-config`. With pnpm, it's installed inside `.pnpm/expo@.../node_modules/expo-asset`, not in the app's own `node_modules`. When Gradle spawns a Metro process for release bundling, Metro's `@expo/metro-config` tries to `require('expo-asset')` — this fails because pnpm's resolution doesn't make transitive deps visible to the calling context.

**Fix — `apps/mobile/package.json`:**
```bash
pnpm add expo-asset@11.0.5   # Must match Expo SDK 52's version
```

**Rule:** Any transitive dependency that Metro, Babel, or Gradle-spawned processes `require()` at runtime must be a direct dependency in the mobile app's `package.json`.

---

### Issue 3: `babel-preset-expo` not found during release bundling

**Symptom:**
```
SyntaxError: index.js: Cannot find module 'babel-preset-expo'
```

**Root cause:** Identical to Issue 2. `babel-preset-expo` is referenced in `babel.config.js` as `presets: ['babel-preset-expo']`. During Gradle's bundle task, `@babel/core` tries to resolve this preset. `@babel/core` lives in `.pnpm/@babel+core@.../`, and from there, `babel-preset-expo` (a dependency of the app, not of `@babel/core`) is invisible.

**Fix:**
```bash
pnpm add babel-preset-expo@12.0.12
```

**Rule:** Same as Issue 2. All Babel presets and plugins must be direct dependencies.

---

### Issue 4: Autolinking generates `expo.core.ExpoModulesPackage` instead of `expo.modules.ExpoModulesPackage`

**Symptom:**
```
error: cannot find symbol
import expo.core.ExpoModulesPackage;
```

**Root cause — the full chain:**

1. Gradle runs `expo-modules-autolinking react-native-config --json --platform android` during settings evaluation.
2. For each dependency, the autolinking reads `react-native.config.js` using `require-from-string` (evaluates the JS file as a string).
3. Expo's `react-native.config.js` starts with:
   ```javascript
   const findProjectRootSync = require('expo-modules-autolinking/exports').findProjectRootSync;
   ```
4. With pnpm, `expo-modules-autolinking` is not resolvable from the `require-from-string` evaluation context (it resolves from the `.pnpm` store, not from the app root).
5. The `require()` throws, the `catch` block returns `null`, and `reactNativeConfig` becomes `null`.
6. The autolinking falls back to auto-detection:
   - Reads `namespace "expo.core"` from expo's `android/build.gradle`
   - Finds `ExpoModulesPackage.kt` in the source tree
   - Generates `import expo.core.ExpoModulesPackage;`
7. But the actual Kotlin class lives in `package expo.modules` — the `namespace` in the build.gradle is a legacy mismatch.

**Fix:**
```bash
pnpm add expo-modules-autolinking@2.0.8
```

This makes `expo-modules-autolinking` directly resolvable, so step 4 succeeds, and the config properly returns `import expo.modules.ExpoModulesPackage;`.

**Rule:** If a dependency's `react-native.config.js` imports any non-standard module, that module must be a direct dependency.

---

### Issue 5: Android screen capture requires MediaProjection foreground service

**Symptom:** `getDisplayMedia()` silently returns no frames or fails on Android 10+.

**Root cause:** Android 10+ requires a foreground service of type `mediaProjection` to capture the screen. `react-native-webrtc` supports this, but it must be explicitly enabled.

**Fix — `MainApplication.kt`:**
```kotlin
import com.oney.WebRTCModule.WebRTCModuleOptions

// In onCreate():
val options = WebRTCModuleOptions.getInstance()
options.enableMediaProjectionService = true
```

Also ensure `app.json` has:
```json
{
  "android": {
    "permissions": [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION"
    ]
  }
}
```

**Rule:** Any Android feature requiring a foreground service must be explicitly enabled in both the native code and the manifest.

---

### Issue 6: Stale autolinking cache survives `gradlew clean`

**Symptom:** Build errors persist even after cleaning.

**Root cause:** The autolinking JSON is generated during Gradle's *settings* evaluation phase (before any tasks run), and cached in `android/build/generated/autolinking/`. The cache check hashes lock files (`yarn.lock`, `package-lock.json`, `package.json`) — but not `pnpm-lock.yaml`. So the cache may never invalidate on pnpm changes.

**Fix — manual cache bust:**
```bash
rm -rf android/build/generated/autolinking
```

Then rebuild. The settings plugin will regenerate the config.

**Rule:** After any dependency change with pnpm, always delete `android/build/generated/autolinking/` before building.

---

### Master Checklist: Adding a Dependency to the Mobile App

When you `pnpm add <package>` in `apps/mobile`:

1. Check if it has native Android/iOS code — if yes, run `npx expo prebuild --platform android`
2. Delete `android/build/generated/autolinking/` to bust the cache
3. If it's a Metro plugin, Babel preset/plugin, or used by `@expo/*` internally, add it as a direct dependency even if it's already a transitive one
4. Run `gradlew clean` before building
5. Test both debug (`expo start --dev-client`) and release (`gradlew assembleRelease`) builds

---

## Part 2 — CI/CD Pipeline Plan

### Current State

- No CI/CD configuration exists
- Release APK is built manually with `./gradlew assembleRelease`
- Release builds use the **debug keystore** (not production-safe)
- No automated testing, linting, or deployment
- Build takes ~6 minutes on a local machine

### Target State

```
Push to main → GitHub Actions → Build APK/AAB → Upload to Play Store (internal track)
                                             → Upload to GitHub Releases (APK artifact)
```

---

### 2.1 Prerequisites Before CI/CD

#### A. Production Signing Key

The current release build uses `debug.keystore`. Play Store requires a proper signing key.

**Generate a release keystore (once, locally):**
```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore classitin-release.keystore \
  -alias classitin \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Classitin, OU=Mobile, O=Classitin, L=City, ST=State, C=US"
```

**Store the keystore securely:**
- Do NOT commit to git
- Store as a GitHub Actions secret (base64-encoded)
- Back up to a password manager or secure vault

**Add to `build.gradle` — release signing config:**
```groovy
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file(System.getenv('ANDROID_KEYSTORE_PATH') ?: 'debug.keystore')
        storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: 'android'
        keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: 'androiddebugkey'
        keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: 'android'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ... rest unchanged
    }
}
```

This way:
- **Locally** (no env vars set): falls back to debug keystore — same behavior as today
- **In CI** (env vars set from secrets): uses the production keystore

#### B. Google Play Service Account

To automate Play Store uploads:

1. Go to [Google Play Console](https://play.google.com/console) → Setup → API access
2. Create a new service account (or link from Google Cloud Console)
3. Grant the service account "Release manager" permissions on your app
4. Download the JSON key file
5. Store the JSON key file contents as a GitHub secret

#### C. Play Store App Listing

Before the first automated upload:

1. Create the app in Play Store Console manually
2. Fill in the required listing info (title, description, screenshots, etc.)
3. Upload the first AAB manually to the internal testing track
4. This establishes the app — subsequent uploads can be automated

---

### 2.2 GitHub Actions Workflows (Implemented)

All workflows below are implemented and live in `.github/workflows/`.

#### Workflow 1: CI — `.github/workflows/ci.yml`

**Triggers:** Every push to `main` and every PR targeting `main`.

**What it does:**
- Typechecks `shared`, `server`, and `web` packages
- Builds the web app with Vite (validates bundling works)
- Runs server and web test suites

**No Android build here** — that's a separate, heavier workflow.

#### Workflow 2: Build Android — `.github/workflows/build-android.yml`

**Triggers:** Push to `main` (when `apps/mobile/`, `packages/shared/`, or `pnpm-lock.yaml` changes), or manual dispatch via GitHub UI.

**What it does:**
- Builds APK (default) or AAB (selectable in manual dispatch)
- Strips local Windows paths from `gradle.properties` for CI compatibility
- Deletes stale autolinking cache before build (pnpm lesson learned)
- Decodes release keystore from GitHub secret (if configured)
- Uploads the artifact for 30-day download
- Also callable by the release workflow via `workflow_call`

#### Workflow 3: Deploy Web — `.github/workflows/deploy-web.yml`

**Triggers:** Push to `main` (when `apps/web/`, `packages/shared/`, or `pnpm-lock.yaml` changes), or manual dispatch.

**What it does:**
- Builds the Vite web app
- Deploys to GitHub Pages via the official `deploy-pages` action
- Requires GitHub Pages to be enabled in repo settings (Settings → Pages → Source: GitHub Actions)

#### Workflow 4: Release Android — `.github/workflows/release-android.yml`

**Triggers:** Pushing a git tag matching `v*` (e.g., `git tag v1.0.1 && git push origin v1.0.1`).

**What it does:**
- Calls the build-android workflow twice (APK + AAB) via `workflow_call`
- Creates a GitHub Release with both artifacts attached
- Uploads AAB to Play Store internal track (if `PLAY_STORE_SERVICE_ACCOUNT_JSON` secret is set)

---

### 2.3 GitHub Secrets to Configure

Go to repo → Settings → Secrets and variables → Actions, and add:

| Secret Name | Value | When Needed |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w 0 classitin-release.keystore` | All release builds |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password | All release builds |
| `ANDROID_KEY_ALIAS` | `classitin` (or your alias) | All release builds |
| `ANDROID_KEY_PASSWORD` | Key password | All release builds |
| `PLAY_STORE_SERVICE_ACCOUNT_JSON` | Full JSON key file contents | Play Store deploy only |

---

### 2.4 Version Management (Implemented)

`android/app/build.gradle` now reads `VERSION_CODE` and `VERSION_NAME` from environment variables, with fallback to defaults for local builds:

```groovy
def code = System.getenv('VERSION_CODE')
versionCode code ? code.toInteger() : 1

def name = System.getenv('VERSION_NAME')
versionName name ?: "1.0.0"
```

The release workflow sets these from the git tag and `github.run_number`. Play Store requires `versionCode` to increase with every upload — `github.run_number` (auto-incrementing integer per workflow) guarantees this.

---

### 2.5 Release Workflow (How to Ship a Version)

**Daily development:**
```
Push to PR → CI runs lint/test/typecheck → Merge to main → Build workflow creates APK artifact
```
Download APK from GitHub Actions artifacts for testing.

**Cutting a release:**
```bash
# 1. Update version in app.json and build.gradle if needed
# 2. Tag and push
git tag v1.0.1
git push origin v1.0.1
```

This triggers the release workflow which:
1. Builds both APK and AAB
2. Creates a GitHub Release with the APK attached (anyone can download and install)
3. Uploads the AAB to Play Store internal testing track
4. Testers on Play Store get the update automatically

**Play Store track progression:**
```
internal → closed testing (alpha) → open testing (beta) → production
```

You promote manually in the Play Store Console when ready. The CI only pushes to `internal`.

---

### 2.6 OTA Updates (Skipping the Build)

For JavaScript-only changes (no native code changes), you can push updates without rebuilding:

**Option A: Expo Updates (EAS Update)**

```bash
pnpm add expo-updates   # in apps/mobile
```

Configure in `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

Then:
```bash
npx eas update --branch production --message "Fix button color"
```

Users get the update on next app launch without going through the Play Store.

**Option B: Self-hosted updates (advanced)**

Host the update bundles on your own server or S3. More control, no Expo account needed, but more setup.

**When OTA works:** JS/TS code changes, image assets, styling.
**When OTA does NOT work:** New native modules, Android permission changes, native code changes — these require a full rebuild and Play Store update.

---

### 2.7 Directory Structure (Current)

```
classitin/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Typecheck + test on every PR
│       ├── deploy-web.yml            # Build web + deploy to GitHub Pages
│       ├── build-android.yml         # Build APK/AAB on push to main
│       └── release-android.yml       # Release on git tag v*
├── apps/
│   ├── web/
│   │   └── vite.config.ts            # Updated: conditional HTTPS for CI compat
│   └── mobile/
│       └── android/
│           └── app/
│               ├── build.gradle      # Updated: env-based signing + versioning
│               ├── debug.keystore    # Dev only (committed)
│               └── classitin-release.keystore  # Prod (NOT committed, from CI secret)
└── docs/
    ├── screen-sharing-fix.md
    └── mobile-build-lessons-and-cicd.md   # This file
```

---

### 2.8 Cost and Time Considerations

| Aspect | Details |
|---|---|
| **GitHub Actions** | Free for public repos. Private repos get 2,000 min/month free. Android builds take ~10-15 min each. |
| **Play Store** | One-time $25 developer registration fee |
| **Expo EAS Update** | Free tier: 1,000 updates/month. Only needed for OTA. |
| **Signing key** | Free to generate. Must be kept forever (lost key = new app listing). |

---

### 2.9 Remaining Steps

What's already done (code changes are committed and ready):
- [x] `build.gradle` — env-based signing config + version management
- [x] `vite.config.ts` — conditional HTTPS (doesn't crash in CI without certs)
- [x] `.github/workflows/ci.yml` — typecheck, build web, run tests
- [x] `.github/workflows/deploy-web.yml` — build + deploy to GitHub Pages
- [x] `.github/workflows/build-android.yml` — build APK/AAB with pnpm fixes
- [x] `.github/workflows/release-android.yml` — tag-triggered release + Play Store
- [x] `.gitignore` — exclude release keystores and build outputs

What you need to do manually:
```
Step 1: Push to GitHub and verify CI workflow runs                 [10 min]
Step 2: Enable GitHub Pages (Settings → Pages → Source: GitHub Actions) [2 min]
Step 3: Generate release keystore, store as GitHub secret          [30 min]
Step 4: Register on Play Store ($25), create app listing           [1 hour]
Step 5: Create service account, store JSON as GitHub secret        [30 min]
Step 6: Tag v1.0.0, verify full pipeline                           [30 min]
Step 7: (Optional) Add expo-updates for OTA                        [1 hour]
```
