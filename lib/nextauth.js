import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

function providerList() {
  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }));
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }));
  }

  if (process.env.MICROSOFT_ENTRA_ID_ID && process.env.MICROSOFT_ENTRA_ID_SECRET) {
    const microsoftProvider = MicrosoftEntraID({
      clientId: process.env.MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.MICROSOFT_ENTRA_ID_ISSUER || 'https://login.microsoftonline.com/consumers/v2.0',
    });

    microsoftProvider.authorization = { params: { scope: 'openid profile email' } };
    microsoftProvider.profile = (profile) => ({
      id: profile.sub,
      name: profile.name,
      email: profile.email || profile.preferred_username,
      image: null,
    });

    providers.push(microsoftProvider);
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: providerList(),
  pages: {
    signIn: '/auth/error',
    error: '/auth/error',
  },
  callbacks: {
    authorized() {
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      if (profile?.name) token.name = profile.name;
      if (profile?.picture) token.picture = profile.picture;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email || session.user.email;
        session.user.name = token.name || session.user.name;
        session.user.image = token.picture || session.user.image;
      }
      return session;
    },
  },
});
