import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';

@Injectable()
export class OAuth2Strategy extends PassportStrategy(Strategy, 'oauth2') {
  constructor() {
    super({
      authorizationURL: 'YOUR_AUTHORIZATION_URL', // e.g., https://accounts.google.com/o/oauth2/v2/auth
      tokenURL: 'YOUR_TOKEN_URL', // e.g., https://oauth2.googleapis.com/token
      clientID: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      callbackURL: 'http://localhost:3000/auth/callback',
      scope: ['email', 'profile'], // The scopes you want to request
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    // This is where you would find or create a user in your database.
    // The `profile` object contains user information from the OAuth provider.
    // For now, we'll just return the profile.
    const user = {
      profile,
      accessToken,
    };
    done(null, user);
  }
}
