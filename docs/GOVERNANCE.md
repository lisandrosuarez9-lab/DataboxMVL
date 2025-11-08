# Project Governance and Architectural Decisions

This document records key architectural and security decisions for the DataboxMVL project.

## Architectural Decision Log

### AD-001: Runtime Authentication Pattern for `score-checker`

-   **Date:** 2025-11-08 06:41:30
-   **Author:** lisandrosuarez9-lab
-   **Reviewer:** @copilot
-   **Status:** Decided

#### Context

The project requires a secure method for the public frontend application to request a credit score from the backend `score-checker` Supabase function. The solution must not expose any service-level secrets to the client.

#### Decision

We will use **Supabase's built-in JWT-based authentication** to secure the `score-checker` function. This aligns with the "Signed Request Handshake" pattern outlined in the project mandate.

The end-to-end flow will be:
1.  The frontend client uses the public `VITE_SUPABASE_ANON_KEY` to communicate with the Supabase authentication service.
2.  Upon a successful sign-in or session refresh, the client receives a short-lived, cryptographically-signed JSON Web Token (JWT).
3.  When calling the `score-checker` function, the Supabase client library will automatically include this JWT in the `Authorization` header of the request.
4.  The `score-checker` function will be configured to require a valid JWT. The Supabase Edge Runtime will automatically verify the token's signature and validity before executing the function. If the token is invalid or missing, the request will be rejected with a `401 Unauthorized` error.

#### Justification

This approach was chosen over a separate Token Exchange or Backend Proxy for the following reasons:

-   **Efficiency and Simplicity:** It leverages existing, battle-tested infrastructure provided by Supabase. It does not require us to build, deploy, host, and secure a separate "middle-man" service, dramatically reducing complexity and development time.
-   **Security:** This is a standard, secure pattern. The sensitive service-role key is never exposed. The JWTs are short-lived and securely signed, preventing tampering.
-   **Maintainability:** The logic is contained within the existing frontend and function code, making it easier to manage and debug than a distributed microservice architecture.