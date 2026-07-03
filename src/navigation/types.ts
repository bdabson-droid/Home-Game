import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { intent?: 'signIn' | 'joinCode'; code?: string } | undefined;
  OtpVerify: { phone: string; intent?: 'signIn' | 'joinCode'; code?: string };
  JoinWithCode: undefined;
};

export type AppTabsParamList = {
  Games: undefined;
  Join: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabsParamList>;
  GameDetail: { gameId: string };
  CreateGame: undefined;
  EditGame: { gameId: string };
  InvitePlayers: { gameId: string };
  NewSession: { gameId: string };
  SessionDetail: { sessionId: string };
  Subscription: { fromCreateGame?: boolean } | undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};
