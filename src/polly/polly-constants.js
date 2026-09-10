/**
 * Constants shared inside the Polly module.
 *
 * These live in their own file so the client and its mock can both use them without
 * importing each other - a cycle that would leave one of them undefined at load time.
 */

/** Error codes of the polly backend module. Deliberately separate from LiquidoExceptionCodes. */
export const PollyError = {
	POLLY_NOT_FOUND: "POLLY_NOT_FOUND",
	ALREADY_VOTED: "ALREADY_VOTED",						// the DB unique constraint on (polly_id, voter_key)
	NOT_POLLY_OWNER: "NOT_POLLY_OWNER",
	POLLY_ALREADY_STARTED: "POLLY_ALREADY_STARTED",		// cannot edit once a ballot exists
	POLLY_FINISHED: "POLLY_FINISHED",
	NEED_PASSKEY: "NEED_PASSKEY",
	INVALID_POLLY: "INVALID_POLLY",						// missing title, too few options, bad vote order
}

/**
 * A polly only ever has these two states.
 * There is no elaboration phase and no start step - it is live from the moment it exists.
 */
export const POLLY_STATUS = {
	VOTING: "VOTING",
	FINISHED: "FINISHED",
}
