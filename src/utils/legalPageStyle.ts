/**
 * Shared styling for the /privacy and /terms pages.
 *
 * Extracted from upstream, where the same block was duplicated in both
 * renderers. Keeping one copy means the two legal pages cannot drift apart
 * visually when either is edited.
 */
export const legalPageStyle = `
    <style>
        html {
            display: flex;
            flex-direction: column;
            min-height: 100%;
        }
        body {
            display: flex;
            flex-direction: column;
            flex: 1 0 auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        main {
            flex: 1;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        h3 {
            color: #7f8c8d;
        }
        strong {
            color: #2c3e50;
        }
        ul {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        th, td {
            border: 1px solid #dfe4e6;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #f8f9fa;
            color: #2c3e50;
        }
        .highlight {
            background-color: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
        }
        .contact {
            background-color: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
        }
        hr {
            border: none;
            height: 2px;
            background-color: #bdc3c7;
            margin: 30px 0;
        }
        footer {
            display: flex;
            justify-content: center;
            column-gap: 24px;
            margin-top: 16px;
        }
    </style>
`;

/** Expliciet's identity, shown as the operator and controller on both pages. */
export const OPERATOR = {
  name: "Expliciet",
  street: "Groeningenweg 5",
  city: "3590 Diepenbeek",
  country: "Belgium",
  email: "info@expliciet.be",
  phone: "011 96 26 36",
  vat: "BE 0822 798 639",
  website: "https://expliciet.be",
};

export const LAST_UPDATED = "28 July 2026";
