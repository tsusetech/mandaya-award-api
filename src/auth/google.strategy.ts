import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const email = emails[0].value;

    // Find or create user in database
    const user = await this.authService.findOrCreateGoogleUser({
      email,
      name: name.displayName || `${name.givenName} ${name.familyName}`,
      firstName: name.givenName,
      lastName: name.familyName,
      picture: photos[0].value,
      googleId: profile.id,
    });

    return user;
  }
}
