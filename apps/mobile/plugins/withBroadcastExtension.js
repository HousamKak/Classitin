/**
 * Expo config plugin that adds an iOS Broadcast Upload Extension target
 * for system-wide screen sharing via ReplayKit.
 *
 * This works with react-native-webrtc's built-in ScreenCapturer which
 * receives frames from the extension via a Unix domain socket in the
 * shared App Group container.
 */
const { withXcodeProject, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const EXTENSION_NAME = 'BroadcastExtension';
const APP_GROUP = 'group.com.classitin.mobile';
const BUNDLE_ID_SUFFIX = '.BroadcastExtension';
const DEPLOYMENT_TARGET = '15.0';

/**
 * Add App Group entitlement to the main app target.
 */
function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.security.application-groups'] = [APP_GROUP];
    return mod;
  });
}

/**
 * Add RTCAppGroupIdentifier and RTCScreenSharingExtension to main app Info.plist.
 * react-native-webrtc reads these to set up the socket path and know which
 * extension to communicate with.
 */
function withInfoPlistKeys(config) {
  return withInfoPlist(config, (mod) => {
    const bundleId = mod.ios?.bundleIdentifier || 'com.classitin.mobile';
    mod.modResults.RTCAppGroupIdentifier = APP_GROUP;
    mod.modResults.RTCScreenSharingExtension = bundleId + BUNDLE_ID_SUFFIX;
    return mod;
  });
}

/**
 * Add the Broadcast Upload Extension target to the Xcode project.
 * Creates the extension source files and configures build settings.
 */
function withBroadcastExtensionTarget(config) {
  return withXcodeProject(config, async (mod) => {
    const xcodeProject = mod.modResults;
    const platformProjectRoot = mod.modRequest.platformProjectRoot; // ios/
    const bundleId = mod.ios?.bundleIdentifier || 'com.classitin.mobile';

    // Create extension directory
    const extDir = path.join(platformProjectRoot, EXTENSION_NAME);
    if (!fs.existsSync(extDir)) {
      fs.mkdirSync(extDir, { recursive: true });
    }

    // Write SampleHandler.swift
    const sampleHandlerSource = getSampleHandlerSource(APP_GROUP);
    fs.writeFileSync(path.join(extDir, 'SampleHandler.swift'), sampleHandlerSource);

    // Write extension Info.plist
    const extensionInfoPlist = getExtensionInfoPlist();
    fs.writeFileSync(path.join(extDir, 'Info.plist'), extensionInfoPlist);

    // Write extension entitlements
    const extensionEntitlements = getExtensionEntitlements(APP_GROUP);
    fs.writeFileSync(path.join(extDir, `${EXTENSION_NAME}.entitlements`), extensionEntitlements);

    // Add extension target to Xcode project
    const targetUuid = xcodeProject.generateUuid();
    const targetName = EXTENSION_NAME;
    const extBundleId = bundleId + BUNDLE_ID_SUFFIX;

    // Add PBXGroup for extension files
    const extGroupKey = xcodeProject.pbxCreateGroup(targetName, targetName);

    // Add source file reference
    const sampleHandlerFile = xcodeProject.addFile(
      `${EXTENSION_NAME}/SampleHandler.swift`,
      extGroupKey,
      { target: targetUuid, lastKnownFileType: 'sourcecode.swift' }
    );

    // Add Info.plist file reference
    xcodeProject.addFile(
      `${EXTENSION_NAME}/Info.plist`,
      extGroupKey,
      { lastKnownFileType: 'text.plist.xml' }
    );

    // Add entitlements file reference
    xcodeProject.addFile(
      `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`,
      extGroupKey,
      { lastKnownFileType: 'text.plist.entitlements' }
    );

    // Add the extension target
    const target = xcodeProject.addTarget(
      targetName,
      'app_extension',
      targetName,
      extBundleId
    );

    if (target) {
      // Add source file to the extension's compile sources build phase
      const buildPhases = target.pbxNativeTarget?.buildPhases || [];

      // Configure build settings for the extension target
      const configurations = xcodeProject.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        const config = configurations[key];
        if (typeof config === 'string') continue; // skip comments
        if (config.buildSettings?.PRODUCT_NAME === `"${targetName}"` ||
            config.buildSettings?.PRODUCT_NAME === targetName) {
          config.buildSettings.SWIFT_VERSION = '5.0';
          config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
          config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${EXTENSION_NAME}/${EXTENSION_NAME}.entitlements`;
          config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
          config.buildSettings.INFOPLIST_FILE = `${EXTENSION_NAME}/Info.plist`;
          config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = extBundleId;
          config.buildSettings.DEVELOPMENT_TEAM = '$(DEVELOPMENT_TEAM)';
          config.buildSettings.MARKETING_VERSION = '2.0.0';
          config.buildSettings.CURRENT_PROJECT_VERSION = '1';
          config.buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
          config.buildSettings.CLANG_ENABLE_MODULES = 'YES';
        }
      }
    }

    // Add extension group to main project group
    const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(extGroupKey, mainGroupKey);

    return mod;
  });
}

function getSampleHandlerSource(appGroup) {
  return `import ReplayKit
import Foundation

/// Broadcast Upload Extension that captures system-wide screen frames
/// and sends them to the main Classitin app via a Unix domain socket.
///
/// react-native-webrtc's ScreenCapturer receives these frames and creates
/// RTCVideoFrames from the raw pixel data.
///
/// Frame protocol (matching react-native-webrtc's SocketConnection.m):
///   CFHTTPMessage with headers:
///     Content-Length: <byte count>
///     Buffer-Width: <pixel width>
///     Buffer-Height: <pixel height>
///     Buffer-Orientation: <UIInterfaceOrientation rawValue>
///   Body: raw BGRA pixel data
class SampleHandler: RPBroadcastSampleHandler {

    private var socketConnection: SocketConnection?
    private let appGroup = "${appGroup}"
    private let socketFileName = "rtc_SSFD"

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        guard let containerUrl = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroup
        ) else {
            finishBroadcastWithError(makeError("Cannot access App Group container"))
            return
        }

        let socketPath = containerUrl.appendingPathComponent(socketFileName).path

        socketConnection = SocketConnection(filePath: socketPath)
        socketConnection?.open()
    }

    override func broadcastPaused() {
        // No action needed — the main app handles producer pause
    }

    override func broadcastResumed() {
        // No action needed — the main app handles producer resume
    }

    override func broadcastFinished() {
        socketConnection?.close()
        socketConnection = nil
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video else { return }
        guard let connection = socketConnection, connection.isOpen else { return }

        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }

        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        let bufferSize = bytesPerRow * height

        guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else { return }

        let data = Data(bytes: baseAddress, count: bufferSize)

        // Get current device orientation
        let orientation = UIInterfaceOrientation.portrait.rawValue

        // Build CFHTTPMessage with frame metadata (matching react-native-webrtc protocol)
        let message = CFHTTPMessageCreateEmpty(kCFAllocatorDefault, true).takeRetainedValue()
        CFHTTPMessageAppendBytes(message, [UInt8](data), data.count)

        // Create header string matching the format SocketConnection.m expects
        let header = "Content-Length: \\(bufferSize)\\r\\nBuffer-Width: \\(width)\\r\\nBuffer-Height: \\(height)\\r\\nBuffer-Orientation: \\(orientation)\\r\\n\\r\\n"

        guard let headerData = header.data(using: .utf8) else { return }

        var frameData = Data()
        frameData.append(headerData)
        frameData.append(data)

        connection.send(data: frameData)
    }

    private func makeError(_ message: String) -> NSError {
        NSError(domain: "com.classitin.broadcast", code: 1, userInfo: [
            NSLocalizedDescriptionKey: message
        ])
    }
}

// MARK: - Unix Domain Socket Connection

/// Connects to the main app's Unix domain socket server (hosted by react-native-webrtc's
/// ScreenCaptureController) within the shared App Group container.
class SocketConnection: NSObject {

    private let filePath: String
    private var outputStream: OutputStream?
    private let writeQueue = DispatchQueue(label: "com.classitin.broadcast.socket", qos: .userInteractive)
    private(set) var isOpen = false

    init(filePath: String) {
        self.filePath = filePath
    }

    func open() {
        // Connect via Unix domain socket
        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)

        let pathBytes = filePath.utf8CString
        guard pathBytes.count <= MemoryLayout.size(ofValue: addr.sun_path) else {
            NSLog("[BroadcastExt] Socket path too long")
            return
        }

        withUnsafeMutablePointer(to: &addr.sun_path) { ptr in
            ptr.withMemoryRebound(to: CChar.self, capacity: pathBytes.count) { dest in
                for (i, byte) in pathBytes.enumerated() {
                    dest[i] = byte
                }
            }
        }

        let fd = socket(AF_UNIX, SOCK_STREAM, 0)
        guard fd >= 0 else {
            NSLog("[BroadcastExt] Failed to create socket")
            return
        }

        let connectResult = withUnsafePointer(to: &addr) { addrPtr in
            addrPtr.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPtr in
                Darwin.connect(fd, sockaddrPtr, socklen_t(MemoryLayout<sockaddr_un>.size))
            }
        }

        guard connectResult == 0 else {
            NSLog("[BroadcastExt] Failed to connect: \\(String(cString: strerror(errno)))")
            Darwin.close(fd)
            return
        }

        outputStream = OutputStream(toFileAtPath: "/dev/fd/\\(fd)", append: false)
        // Create an output stream from the connected socket fd
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?
        CFStreamCreatePairWithSocket(kCFAllocatorDefault, fd, &readStream, &writeStream)

        if let ws = writeStream?.takeRetainedValue() {
            outputStream = ws as OutputStream
            CFWriteStreamSetProperty(ws, CFStreamPropertyKey(rawValue: kCFStreamPropertyShouldCloseNativeSocket), kCFBooleanTrue)
            outputStream?.open()
            isOpen = true
            NSLog("[BroadcastExt] Socket connected")
        } else {
            Darwin.close(fd)
            NSLog("[BroadcastExt] Failed to create output stream")
        }
        readStream?.release()
    }

    func close() {
        writeQueue.sync {
            outputStream?.close()
            outputStream = nil
            isOpen = false
        }
        NSLog("[BroadcastExt] Socket closed")
    }

    func send(data: Data) {
        writeQueue.async { [weak self] in
            guard let self = self, let stream = self.outputStream, self.isOpen else { return }

            data.withUnsafeBytes { rawBuffer in
                guard let ptr = rawBuffer.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
                var bytesRemaining = data.count
                var offset = 0

                while bytesRemaining > 0 {
                    let written = stream.write(ptr.advanced(by: offset), maxLength: bytesRemaining)
                    if written <= 0 {
                        NSLog("[BroadcastExt] Write error, closing")
                        self.isOpen = false
                        return
                    }
                    bytesRemaining -= written
                    offset += written
                }
            }
        }
    }
}
`;
}

function getExtensionInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>Classitin Broadcast</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.broadcast-services-upload</string>
        <key>NSExtensionPrincipalClass</key>
        <string>$(PRODUCT_MODULE_NAME).SampleHandler</string>
    </dict>
</dict>
</plist>
`;
}

function getExtensionEntitlements(appGroup) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${appGroup}</string>
    </array>
</dict>
</plist>
`;
}

/**
 * Main plugin — compose all modifications.
 */
function withBroadcastExtension(config) {
  config = withAppGroupEntitlement(config);
  config = withInfoPlistKeys(config);
  config = withBroadcastExtensionTarget(config);
  return config;
}

module.exports = withBroadcastExtension;
