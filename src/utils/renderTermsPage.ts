import { LAST_UPDATED, OPERATOR, legalPageStyle } from "./legalPageStyle";

/**
 * Terms of service for this deployment.
 *
 * Upstream served Stape, Inc.'s terms, naming them as the operator. This
 * deployment is run by Expliciet for Expliciet's own staff, so the terms
 * describe that arrangement rather than a public SaaS offering.
 */
export const renderTermsPage = () => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex,nofollow" />
        <title>Terms of Service - Expliciet Marketing MCP Hub</title>
        ${legalPageStyle}
    </head>
    <body>
    <main>
        <h1>Terms of Service</h1>
        <p><em>Last updated: ${LAST_UPDATED}</em></p>

        <div class="highlight">
            <p><strong>This is an internal tool.</strong> The Expliciet Marketing MCP Hub (the "Service") is operated by ${OPERATOR.name} for its own staff and for people it has explicitly authorised. It is not a public product and is not offered to the general public. If you have reached this page without having been given access by Expliciet, these terms grant you no right to use the Service.</p>
        </div>

        <h2>1. Who operates the Service</h2>
        <div class="contact">
            <p><strong>${OPERATOR.name}</strong><br>
            ${OPERATOR.street}<br>
            ${OPERATOR.city}<br>
            ${OPERATOR.country}<br>
            VAT ${OPERATOR.vat}</p>
            <p>Email: <strong>${OPERATOR.email}</strong><br>
            Telephone: <strong>${OPERATOR.phone}</strong></p>
        </div>
        <p>In these terms, "we", "us" and "Expliciet" mean the company above. "You" means the person using the Service.</p>

        <h2>2. What the Service does</h2>
        <p>The Service is a Model Context Protocol (MCP) server that connects an AI client, such as Claude, to the Google Tag Manager API. After you sign in with your Google account and grant permission, the AI client can read and change Google Tag Manager configuration on your behalf.</p>
        <p>The Service acts strictly under your own Google permissions. It cannot reach any Tag Manager account, container or workspace that your Google account could not already reach. It holds no separate privileged account of its own.</p>

        <h2>3. The Service can change live websites</h2>
        <p>This is the most important clause on this page. Google Tag Manager controls tags that run on live websites, including those of Expliciet's clients. Through the Service, an AI client can create, modify and delete tags, triggers and variables, and can <strong>publish a container version, which takes effect immediately on every site using that container</strong>.</p>
        <p>You are responsible for what you instruct the Service to do. In particular:</p>
        <ul>
            <li>Review what the AI proposes before you let it publish. AI clients can misunderstand an instruction.</li>
            <li>Test against a test container before working on a container that matters.</li>
            <li>Do not use the Service on a client's container unless you are authorised to make changes to that client's tagging.</li>
        </ul>

        <h2>4. Acceptable use</h2>
        <p>You agree not to use the Service:</p>
        <ul>
            <li>to access Google Tag Manager accounts you are not authorised to work on;</li>
            <li>to deploy tags that collect personal data unlawfully, or that breach the <a href="https://www.google.com/about/company/user-consent-policy/" target="_blank">Google EU User Consent Policy</a> or applicable privacy law;</li>
            <li>to deploy code that is malicious, misleading, or that infringes someone else's rights;</li>
            <li>in any way that breaches the <a href="https://marketingplatform.google.com/about/analytics/tag-manager/use-policy/" target="_blank">Google Tag Manager Use Policy</a> or the Google Terms of Service, which continue to apply to your use of Tag Manager itself;</li>
            <li>to attempt to gain access to the Service's own infrastructure, credentials, or another user's session.</li>
        </ul>

        <h2>5. Your account and access</h2>
        <p>Access is tied to your personal Google account. Do not share your session or let anyone else act under your identity. Tell us at <strong>${OPERATOR.email}</strong> if you believe your access has been misused.</p>
        <p>We may suspend or withdraw access at any time, in particular when someone leaves Expliciet, when access is misused, or when we need to protect a client's site.</p>

        <h2>6. Third-party services</h2>
        <p>The Service depends on Google Tag Manager, on the AI client you choose to connect, and on Cloudflare for hosting. Each is operated by a separate company under its own terms. We are not responsible for their availability, their pricing, or changes they make. Anything you type into your AI client is handled by that client's provider under that provider's own terms and privacy policy.</p>

        <h2>7. Open source and attribution</h2>
        <p>The Service is built on <a href="https://github.com/stape-io/google-tag-manager-mcp-server" target="_blank">stape-io/google-tag-manager-mcp-server</a>, published by Stape, Inc. under the Apache License 2.0 and modified by Expliciet. Stape, Inc. does not operate this deployment, has no relationship with it, and provides no support or warranty for it. Our modifications are published at <a href="https://github.com/Expliciet-BV/gtm-mcp" target="_blank">github.com/Expliciet-BV/gtm-mcp</a>.</p>

        <h2>8. No warranty</h2>
        <p>The Service is provided "as is", without warranty of any kind. We do not promise that it will be available without interruption, that it will be free of errors, or that an AI client will interpret your instructions correctly. It is an internal tool under active development.</p>

        <h2>9. Liability</h2>
        <p>To the extent permitted by Belgian law, Expliciet is not liable for indirect or consequential loss arising from use of the Service, including lost revenue or lost data resulting from a tag published through it. Nothing in these terms excludes liability for fraud, for wilful misconduct, or for anything else that cannot lawfully be excluded.</p>
        <p>This clause does not affect Expliciet's obligations to its clients under the separate agreements it has with them.</p>

        <h2>10. Privacy</h2>
        <p>How the Service handles personal data is described in our <a href="/privacy">Privacy Notice</a>.</p>

        <h2>11. Changes</h2>
        <p>We may update these terms as the Service develops. The date at the top reflects the most recent change. Continuing to use the Service after a change means you accept the updated terms.</p>

        <h2>12. Governing law</h2>
        <p>These terms are governed by Belgian law. Disputes fall under the jurisdiction of the courts competent for the district of Hasselt, Belgium.</p>

        <h2>13. Contact</h2>
        <p>Questions about these terms, or about the Service generally: <strong>${OPERATOR.email}</strong>, telephone ${OPERATOR.phone}, or by post at the address above.</p>
    </main>

    <footer>
        <a href="/">Home</a>
        <a href="/privacy">Privacy Notice</a>
    </footer>
    </body>
    </html>
  `;
};
