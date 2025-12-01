import crypto from 'crypto';

class EmailService {
  constructor() {
    this.mode = process.env.EMAIL_MODE || 'console'; // 'console' or 'smtp'
    this.appUrl = process.env.APP_URL || 'http://localhost:5173';
  }

  /**
   * Generiere einen sicheren Token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Sende Verifikations-E-Mail
   */
  async sendVerificationEmail(email, username, token) {
    const verificationUrl = `${this.appUrl}/verify-email?token=${token}`;
    
    const emailContent = {
      to: email,
      subject: 'Bestätige deine E-Mail-Adresse - Refresh Your English',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Willkommen bei Refresh Your English, ${username}! 🎉</h2>
          <p>Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
          <p>
            <a href="${verificationUrl}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              E-Mail bestätigen
            </a>
          </p>
          <p>Oder kopiere diesen Link in deinen Browser:</p>
          <p style="color: #666; font-size: 14px;">${verificationUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Dieser Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.
          </p>
        </div>
      `,
      text: `
Willkommen bei Refresh Your English, ${username}!

Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.

Verifikationslink: ${verificationUrl}

Dieser Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, ignoriere diese E-Mail.
      `
    };

    return this._sendEmail(emailContent);
  }

  /**
   * Sende Passwort-Reset-E-Mail
   */
  async sendPasswordResetEmail(email, username, token) {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    
    const emailContent = {
      to: email,
      subject: 'Passwort zurücksetzen - Refresh Your English',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Passwort zurücksetzen</h2>
          <p>Hallo ${username},</p>
          <p>Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.</p>
          <p>
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Passwort zurücksetzen
            </a>
          </p>
          <p>Oder kopiere diesen Link in deinen Browser:</p>
          <p style="color: #666; font-size: 14px;">${resetUrl}</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Dieser Link ist 1 Stunde gültig. Falls du keine Passwort-Zurücksetzung angefordert hast, ignoriere diese E-Mail.
          </p>
        </div>
      `,
      text: `
Passwort zurücksetzen

Hallo ${username},

Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.

Reset-Link: ${resetUrl}

Dieser Link ist 1 Stunde gültig. Falls du keine Passwort-Zurücksetzung angefordert hast, ignoriere diese E-Mail.
      `
    };

    return this._sendEmail(emailContent);
  }

  /**
   * Interne Methode zum Versenden von E-Mails
   */
  async _sendEmail(emailContent) {
    if (this.mode === 'console') {
      // Entwicklungsmodus - E-Mails in Konsole ausgeben
      console.log('\n========== E-MAIL ==========');
      console.log('To:', emailContent.to);
      console.log('Subject:', emailContent.subject);
      console.log('Text:', emailContent.text);
      console.log('============================\n');
      return { success: true, mode: 'console' };
    }

    // TODO: Implementierung für echten E-Mail-Versand (z.B. mit Nodemailer)
    // Für Produktion: SMTP-Konfiguration oder Service wie SendGrid, Mailgun, etc.
    throw new Error('SMTP email sending not implemented yet. Set EMAIL_MODE=console for development.');
  }
}

export default new EmailService();
