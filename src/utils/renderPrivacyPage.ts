import { LAST_UPDATED, OPERATOR, legalPageStyle } from "./legalPageStyle";

/**
 * Privacy notice for this deployment.
 *
 * Upstream served Stape, Inc.'s notice, which on a self-hosted fork names the
 * wrong company as controller. This describes what this deployment actually
 * does: it holds Google OAuth tokens so an MCP client can call the Tag Manager
 * API as the signed-in user, and it does not store the Tag Manager data itself.
 */
export const renderPrivacyPage = () => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex,nofollow" />
        <title>Privacy Notice - Expliciet Marketing MCP Hub</title>
        ${legalPageStyle}
    </head>
    <body>
    <main>
        <h1>Privacy Notice</h1>
        <p><em>Last updated: ${LAST_UPDATED}</em></p>

        <h2>Who is responsible for your data</h2>
        <p>This service, the <strong>Expliciet Marketing MCP Hub</strong> (the "Service"), is operated by <strong>${OPERATOR.name}</strong>. Expliciet is the data controller for the personal data described below within the meaning of the General Data Protection Regulation (GDPR).</p>

        <div class="contact">
            <p><strong>${OPERATOR.name}</strong><br>
            ${OPERATOR.street}<br>
            ${OPERATOR.city}<br>
            ${OPERATOR.country}<br>
            VAT ${OPERATOR.vat}</p>
            <p>Email: <strong>${OPERATOR.email}</strong><br>
            Telephone: <strong>${OPERATOR.phone}</strong></p>
        </div>

        <h2>What the Service does</h2>
        <p>The Service is a Model Context Protocol (MCP) server. It lets an AI client, such as Claude, work with Google Tag Manager on your behalf. You sign in with your own Google account and grant the Service permission to use the Google Tag Manager API. From then on, the Service can read and change exactly the Tag Manager accounts and containers <strong>your own Google account already has access to</strong>, and nothing beyond that.</p>

        <h2>What personal data we process</h2>
        <table>
            <thead>
                <tr><th>Data</th><th>Why</th><th>Where it is kept</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>Your Google account identifier, email address and basic profile (name, profile picture)</td>
                    <td>To identify your session and show you which account is connected</td>
                    <td>Cloudflare KV, for as long as the authorisation lasts</td>
                </tr>
                <tr>
                    <td>Google OAuth tokens (an access token and a refresh token)</td>
                    <td>To call the Google Tag Manager API as you, without asking you to sign in for every action</td>
                    <td>Cloudflare KV and a Cloudflare Durable Object, encrypted in transit and at rest by Cloudflare</td>
                </tr>
                <tr>
                    <td>Operational logs (which tool was called, when, and whether it succeeded)</td>
                    <td>To debug problems and to keep a record of changes made to Tag Manager containers</td>
                    <td>Cloudflare Workers logs</td>
                </tr>
            </tbody>
        </table>

        <h3>What we do not do</h3>
        <ul>
            <li>We do <strong>not</strong> store the contents of your Google Tag Manager accounts, containers, tags, triggers or variables. That data passes through the Service in response to your requests and is not retained.</li>
            <li>We do <strong>not</strong> sell, rent or share your personal data with third parties for their own purposes.</li>
            <li>We do <strong>not</strong> use your data for advertising or profiling.</li>
        </ul>

        <h2>Legal basis</h2>
        <ul>
            <li><strong>Consent</strong> for the connection to your Google account. You grant it on Google's own consent screen and can withdraw it at any time, see "Your rights" below.</li>
            <li><strong>Legitimate interest</strong> for operational logging, so that Expliciet can run the Service reliably and can establish who made a change to a Tag Manager container.</li>
        </ul>

        <div class="highlight">
            <h2>Google API Services User Data Policy</h2>
            <p><strong>Expliciet's use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank">Google API Services User Data Policy</a>, including the Limited Use requirements.</strong></p>
            <p>Concretely, data obtained through Google APIs is used only to provide the features you request through your MCP client. In particular:</p>
            <ul>
                <li>We do <strong>not</strong> use, transfer or sell this data to create, train or improve any machine learning or artificial intelligence model, whether generalised or personalised.</li>
                <li>We do <strong>not</strong> use it for advertising.</li>
                <li>We do <strong>not</strong> allow humans to read it, except where you have given explicit permission, where it is necessary for security purposes such as investigating abuse, where the law requires it, or where the data has been aggregated and anonymised.</li>
                <li>We do <strong>not</strong> retain Tag Manager content beyond what is needed to answer the request that asked for it.</li>
            </ul>
            <p>Note that the AI client you connect, for example Claude, is a separate service run by a separate company under its own terms and privacy policy. Data you send to it is governed by that policy, not by this one. Choose your MCP client accordingly.</p>
        </div>

        <h2>Who processes data on our behalf</h2>
        <ul>
            <li><strong>Cloudflare, Inc.</strong> hosts the Service and stores the authorisation data described above.</li>
            <li><strong>Google Ireland Limited / Google LLC</strong> provides the Tag Manager API and the sign-in flow.</li>
        </ul>
        <p>Both may process data outside the European Economic Area. Where that happens, transfers rely on the European Commission's Standard Contractual Clauses.</p>

        <h2>How long we keep it</h2>
        <p>Authorisation data is kept until you disconnect, whichever comes first:</p>
        <ul>
            <li>You revoke access from your <a href="https://myaccount.google.com/permissions" target="_blank">Google Account permissions page</a>.</li>
            <li>You call the <code>gtm_remove_session</code> tool from your MCP client, which deletes the stored authorisation for your account.</li>
            <li>Google expires the token on its own. While this application is in testing status, Google expires refresh tokens after seven days.</li>
        </ul>
        <p>Operational logs are retained for a limited period for debugging and audit purposes and are then discarded.</p>

        <h2>Security</h2>
        <ul>
            <li>All traffic to and from the Service uses HTTPS.</li>
            <li>Tokens are held in Cloudflare's storage rather than in application code or in the source repository.</li>
            <li>The Service requests only the Google permissions it needs to operate the Tag Manager tools it exposes.</li>
        </ul>

        <h2>Your rights</h2>
        <p>Under the GDPR you have the right to access your personal data, to have it corrected or erased, to restrict or object to processing, and to data portability. To exercise any of these, contact us at <strong>${OPERATOR.email}</strong>.</p>
        <p>You can withdraw the Service's access to your Google account yourself at any time, without contacting us, at <a href="https://myaccount.google.com/permissions" target="_blank">myaccount.google.com/permissions</a>.</p>
        <p>If you believe we have handled your data improperly, you may lodge a complaint with the Belgian Data Protection Authority (Gegevensbeschermingsautoriteit), Drukpersstraat 35, 1000 Brussels, <a href="https://www.gegevensbeschermingsautoriteit.be" target="_blank">gegevensbeschermingsautoriteit.be</a>.</p>

        <h2>Children</h2>
        <p>The Service is a professional tool and is not directed at children. We do not knowingly process the personal data of anyone under 16.</p>

        <h2>Changes to this notice</h2>
        <p>We may update this notice as the Service develops. The date at the top reflects the most recent change. Material changes will be communicated to the people using the Service.</p>

        <h2>Contact</h2>
        <p>Questions about this notice or about how the Service handles data: <strong>${OPERATOR.email}</strong>, or by post at the address above.</p>
    </main>

    <footer>
        <a href="/">Home</a>
        <a href="/terms">Terms of Service</a>
    </footer>
    </body>
    </html>
  `;
};
