import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/stores/authStore';
import { LoginScreen } from '@/screens/LoginScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';
import { RoomListScreen } from '@/screens/RoomListScreen';
import { RoomDetailScreen } from '@/screens/RoomDetailScreen';
import { JoinRoomScreen } from '@/screens/JoinRoomScreen';
import { TeacherDashboardScreen } from '@/screens/TeacherDashboardScreen';
import { StudentSessionScreen } from '@/screens/StudentSessionScreen';
import { colors } from '@/theme';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  RoomList: undefined;
  RoomDetail: { roomId: string };
  JoinRoom: undefined;
  TeacherDashboard: { roomId: string };
  StudentSession: { roomId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerShadowVisible: false,
          headerTintColor: colors.gray[900],
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.gray[50] },
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Sign Up', headerBackTitle: 'Back' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="RoomList"
              component={RoomListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="RoomDetail"
              component={RoomDetailScreen}
              options={{ title: 'Room' }}
            />
            <Stack.Screen
              name="JoinRoom"
              component={JoinRoomScreen}
              options={{ title: 'Join Room' }}
            />
            <Stack.Screen
              name="TeacherDashboard"
              component={TeacherDashboardScreen}
              options={{ title: 'Session', headerBackTitle: 'Leave' }}
            />
            <Stack.Screen
              name="StudentSession"
              component={StudentSessionScreen}
              options={{ title: 'Session', headerBackTitle: 'Leave' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
