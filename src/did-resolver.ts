/**
 * Simple did:web resolver.
 *
 * In production, did:web resolution fetches https://<domain>/.well-known/did.json
 * and returns the DID Document. For this demo, we use a local mock that returns
 * a valid DID Document structure without making network requests.
 *
 * See: https://w3c-ccg.github.io/did-method-web/
 */

export interface DidDocument {
  "@context": string[];
  id: string;
  verificationMethod?: Array<{
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase?: string;
  }>;
  authentication?: string[];
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

/**
 * Mock DID Documents for demo purposes.
 * In production, these would be fetched from the domain's .well-known/did.json.
 */
const MOCK_DID_DOCUMENTS: Record<string, DidDocument> = {
  "did:web:agent.example.com": {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/suites/ed25519-2020/v1",
    ],
    id: "did:web:agent.example.com",
    verificationMethod: [
      {
        id: "did:web:agent.example.com#key-1",
        type: "Ed25519VerificationKey2020",
        controller: "did:web:agent.example.com",
        publicKeyMultibase: "z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
      },
    ],
    authentication: ["did:web:agent.example.com#key-1"],
    service: [
      {
        id: "did:web:agent.example.com#ack-pay",
        type: "ACKPayEndpoint",
        serviceEndpoint: "https://agent.example.com/ack-pay",
      },
    ],
  },
  "did:web:example.com": {
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: "did:web:example.com",
    verificationMethod: [
      {
        id: "did:web:example.com#key-1",
        type: "Ed25519VerificationKey2020",
        controller: "did:web:example.com",
        publicKeyMultibase: "z6MknGc3ocHs3zdPiJbnaaqDi58NGb4pk1Sp9WxmbGVo2EGx",
      },
    ],
    authentication: ["did:web:example.com#key-1"],
    service: [
      {
        id: "did:web:example.com#ack-pay",
        type: "ACKPayEndpoint",
        serviceEndpoint: "https://example.com/ack-pay",
      },
    ],
  },
};

/**
 * Resolve a did:web identifier to a DID Document.
 *
 * For the demo, returns a mock DID Document. In production, this would:
 * 1. Parse the DID to extract the domain (e.g., did:web:example.com -> example.com)
 * 2. Fetch https://example.com/.well-known/did.json
 * 3. Validate the DID Document structure
 * 4. Return the parsed document
 *
 * @param did - The did:web identifier to resolve
 * @returns The resolved DID Document
 * @throws If the DID is not a valid did:web or cannot be resolved
 */
export function resolveDid(did: string): DidDocument {
  if (!did.startsWith("did:web:")) {
    throw new Error(`Unsupported DID method. Expected did:web:, got: ${did}`);
  }

  const domain = did.replace("did:web:", "");
  if (!domain || domain.length === 0) {
    throw new Error("DID domain cannot be empty");
  }

  // In production: fetch(`https://${domain}/.well-known/did.json`)
  const document = MOCK_DID_DOCUMENTS[did];

  if (!document) {
    throw new Error(
      `Could not resolve DID: ${did}. ` +
        `In production, this would fetch https://${domain}/.well-known/did.json`
    );
  }

  return document;
}

/**
 * Extract the domain from a did:web identifier.
 *
 * @param did - The did:web identifier
 * @returns The domain portion of the DID
 */
export function extractDomain(did: string): string {
  if (!did.startsWith("did:web:")) {
    throw new Error(`Not a did:web identifier: ${did}`);
  }
  return did.replace("did:web:", "").replace(/:/g, "/");
}
