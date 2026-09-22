/**
 * Constants shared between server and client code.
 *
 * These live apart from the modules that use them because those modules import
 * the Sectors client, which is server-only. A client component importing a
 * constant must not drag the API key path into the browser bundle, so anything
 * both sides need belongs here.
 */

/** Cap on symbols per comparison, bounding the credit cost of one request. */
export const MAX_COMPARE = 4;

/** Minimum symbols before a comparison is meaningful. */
export const MIN_COMPARE = 2;
