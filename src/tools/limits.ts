/**
 * Shared input-size caps for tool schemas.
 *
 * These bound the work a single tool call can trigger in this single-process
 * stdio server — a robustness / availability guard so a pathological input
 * (which an agent might forward from untrusted content) cannot exhaust memory
 * or stall the event loop. Values are generous for real agent-driven use and
 * tunable; they are not a security boundary.
 */

/** Max length of a data-value / row array (the common numeric series). */
export const MAX_DATA_POINTS = 10_000;

/** Max "width" arrays: visualization variables, hypothesis-test group/row count. */
export const MAX_DIMENSIONS = 1_000;

/**
 * Max decision-matrix dimension (options / criteria / scores). Kept small
 * because `decision_analysis` output is O(options × criteria) markdown rows.
 */
export const MAX_DECISION_ITEMS = 100;

/** Max regression predictors — the multivariate solve is O(predictors³). */
export const MAX_PREDICTORS = 50;

/** Max numeric columns for statistics — correlation is O(columns² × rows). */
export const MAX_NUMERIC_COLUMNS = 30;

/** Max length of a free-text field (argument, text, problem, query). */
export const MAX_STRING_LENGTH = 50_000;
