/**
 * <h1>liqui-loc — LIQUIDO's own localisation</h1>
 *
 * Replaces vue-i18n. Everything LIQUIDO needs from a localisation library is here, and nearly all of
 * it is a thin wrapper over the platform's own `Intl`:
 *
 *   - translated strings, global and per component
 *   - `{placeholder}` interpolation
 *   - pluralisation via the "zero | one | other" pipe syntax
 *   - date formatting (DD.MM.YYYY / MM/DD/YYYY)
 *   - relative time ("vor 3 Tagen", "in 5 Tagen")
 *
 * <h2>Why not vue-i18n</h2>
 *
 * It is a large dependency for a narrow need, and in legacy mode `$t` is not callable from
 * `<script setup>` while `useI18n()` cannot see component-local messages. That blocked the move to
 * the Composition API. {@link useLoc} works in both API styles and sees local messages either way.
 *
 * <h2>Scope</h2>
 *
 * Aimed at languages with simple plural rules — de, en, and later fr/es/it. NOT suitable as-is for
 * languages with more than two plural forms (Polish, Russian, Arabic); see the note on {@link tc}.
 *
 * <h2>HTML in messages</h2>
 *
 * {@link t} returns PLAIN TEXT. Vue escapes it on render, so an interpolated user name can never
 * introduce markup. Messages that legitimately contain HTML go through the `<liqui-loc-html>`
 * component instead, which is the single place where markup is allowed and sanitised.
 * Do not write `v-html="$t(...)"`.
 */
import { ref, getCurrentInstance } from "vue"

/** The active locale. A ref, so every template that called t() re-renders when it changes. */
export const locale = ref("de")

/** Consulted when a key is missing in `locale`. */
export const fallbackLocale = ref("de")

/** Global catalogue: { de: { key: "text" }, en: {...} }. Filled by createLoc(). */
let globalMessages = {}

/** Keys we have already warned about, so a missing key logs once and not once per render. */
const warnedKeys = new Set()

/**
 * Switch language. Templates re-render because `locale` is a ref.
 *
 * Known limitation: strings already resolved and stored elsewhere do NOT update - notably the ~15
 * `store.setHeaderTitle(t("..."))` calls, which push a finished string into non-reactive state.
 * That was equally true under vue-i18n.
 */
export function setLocale(next) {
	locale.value = next
}

/**
 * Find a message, most specific catalogue first:
 *   component-local[locale] -> component-local[fallback] -> global[locale] -> global[fallback]
 *
 * Local-over-global is load-bearing, not incidental: several components deliberately redefine a
 * global key with different text (poll-winner's "Loading", welcome-chat's "JoinTeam",
 * poll-create/poll-edit's "createNewPoll"). Changing this order changes visible strings.
 *
 * @param {String} key message key
 * @param {Object} localMessages the calling component's own catalogue, or undefined
 * @returns {String} the raw message, or undefined when nothing has it
 */
function lookup(key, localMessages) {
	const loc = locale.value
	const fb = fallbackLocale.value
	return localMessages?.[loc]?.[key]
		?? localMessages?.[fb]?.[key]
		?? globalMessages?.[loc]?.[key]
		?? globalMessages?.[fb]?.[key]
}

/** Missing keys are a bug, but must not spam the console on every re-render. */
function warnMissing(key) {
	if (warnedKeys.has(key)) return
	warnedKeys.add(key)
	console.warn(`[liqui-loc] missing translation for key '${key}' (locale '${locale.value}')`)
}

/**
 * Replace every {placeholder} with the matching value from `params`.
 *
 * A placeholder with no matching param is left standing rather than blanked - a visible `{foo}`
 * points at the bug, an empty gap hides it. Matches \w+ only, so it cannot be tricked into
 * consuming surrounding text.
 */
function interpolate(message, params) {
	if (!params) return message
	return message.replace(/\{(\w+)\}/g, (whole, name) =>
		Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole
	)
}

/**
 * Translate a key to PLAIN TEXT.
 *
 * @param {String} key e.g. "createNewPoll"
 * @param {Object} [params] values for {placeholders}
 * @param {Object} [localMessages] the component's own catalogue (supplied by $t / useLoc)
 * @returns {String} the translated text, or the key itself when it is missing
 */
export function translate(key, params, localMessages) {
	if (key === undefined || key === null || key === "") return ""
	const message = lookup(key, localMessages)
	if (message === undefined) {
		warnMissing(key)
		return key   // returning the key makes the gap identifiable in the UI, rather than blank
	}
	if (typeof params === "number") {
		console.warn(`[liqui-loc] t('${key}', ${params}) was called with a number. Did you mean tc()?`)
		return message
	}
	return interpolate(message, params)
}

/**
 * Pick one form out of a "zero | one | other" message and translate it.
 *
 * The pipe syntax and its selection rule are kept exactly as vue-i18n had them, so no message
 * needed rewriting:
 *   3 forms -> n === 0 ? zero : n === 1 ? one : other
 *   2 forms -> n === 1 ? one  : other
 *
 * `n` is always available as a placeholder: "{n} Vorschläge".
 *
 * NOTE for whoever adds a language with more than two plural forms (pl, ru, ar): swap this
 * selection for `new Intl.PluralRules(locale).select(n)` and key the forms by category name.
 * de/en/fr/es/it are all one/other, so it is not needed yet.
 */
export function translatePlural(key, count, params, localMessages) {
	const message = lookup(key, localMessages)
	if (message === undefined) {
		warnMissing(key)
		return key
	}
	const n = Number(count) || 0
	const forms = message.split("|").map(f => f.trim())
	let form
	if (forms.length >= 3) form = n === 0 ? forms[0] : n === 1 ? forms[1] : forms[2]
	else if (forms.length === 2) form = n === 1 ? forms[0] : forms[1]
	else form = forms[0]
	return interpolate(form, { n, ...params })
}

/**
 * Format a date without a time.
 *
 *   de -> 05.08.2026      en -> 08/05/2026
 *
 * Note plain toLocaleDateString() is NOT enough: de-DE renders "5.8.2026", unpadded. The 2-digit
 * options are what produce the format LIQUIDO wants.
 *
 * @param {Date|String|Number} date anything the Date constructor accepts
 * @param {String} [style] "date" (default) - reserved for future styles
 */
export function formatDate(date, style = "date") {
	const d = date instanceof Date ? date : new Date(date)
	if (isNaN(d.getTime())) return ""
	const options = style === "date"
		? { day: "2-digit", month: "2-digit", year: "numeric" }
		: { dateStyle: "medium" }
	return new Intl.DateTimeFormat(localeTag(), options).format(d)
}

/**
 * How long ago, or how far ahead: "vor 3 Tagen", "in 5 Tagen", "gestern".
 *
 * Intl.RelativeTimeFormat does the wording, but it will not CHOOSE the unit - hand it (-3, "day")
 * and it says "vor 3 Tagen". Picking day vs hour vs month is this table's job, and the thresholds
 * mirror the ones dayjs used so the wording does not shift now that dayjs is gone.
 *
 * @param {Date|String|Number} date the point in time to compare against now
 * @returns {String} localised relative time, "" for an unparseable date
 */
export function fromNow(date) {
	const d = date instanceof Date ? date : new Date(date)
	if (isNaN(d.getTime())) return ""
	const diffMs = d.getTime() - Date.now()
	const abs = Math.abs(diffMs)
	const sec = abs / 1000, min = sec / 60, hour = min / 60, day = hour / 24, month = day / 30, year = day / 365

	let value, unit
	if (sec < 45) { value = sec; unit = "second" }
	else if (min < 45) { value = min; unit = "minute" }
	else if (hour < 22) { value = hour; unit = "hour" }
	else if (day < 26) { value = day; unit = "day" }
	else if (month < 11) { value = month; unit = "month" }
	else { value = year; unit = "year" }

	const signed = Math.round(value) * (diffMs < 0 ? -1 : 1)
	return new Intl.RelativeTimeFormat(localeTag(), { numeric: "auto" }).format(signed, unit)
}

/** Intl wants a BCP-47 tag. Our locales are already valid ones ("de", "en"). */
function localeTag() {
	return locale.value
}

/**
 * The calling component's own `i18n: { messages }` option, or undefined.
 *
 * Reading `$options` is exactly how vue-i18n's legacy mode found these (its defineMixin reads
 * `this.$options.i18n` in beforeCreate) - and, as there, no `app.config.optionMergeStrategies`
 * registration is needed: a component's own custom option is carried through as-is. It also
 * survives the two-<script>-block pattern that join-team-v2.vue uses.
 */
function localMessagesOf(instance) {
	return instance?.$options?.i18n?.messages
}

/**
 * For `<script setup>` - and the reason liqui-loc exists at all.
 *
 * Unlike vue-i18n's useI18n(), this sees the component's OWN messages as well as the global ones,
 * so a Composition-API component does not have to promote its strings to the global catalogue.
 *
 * @returns {Object} { t, tc, d, fromNow, locale, setLocale }
 */
export function useLoc() {
	const instance = getCurrentInstance()
	const local = () => localMessagesOf(instance?.proxy)
	return {
		t: (key, params) => translate(key, params, local()),
		tc: (key, count, params) => translatePlural(key, count, params, local()),
		d: formatDate,
		fromNow,
		locale,
		setLocale,
	}
}

/** Translate outside any component (main.js error handlers). Global catalogue only. */
export function t(key, params) {
	return translate(key, params, undefined)
}

/**
 * Build the Vue plugin.
 *
 * @param {Object} options
 * @param {String} options.locale         initial locale, e.g. "de"
 * @param {String} options.fallbackLocale consulted when a key is missing
 * @param {Object} options.messages       global catalogue { de: {...}, en: {...} }
 */
export function createLoc({ locale: initial = "de", fallbackLocale: fb = "de", messages = {} } = {}) {
	locale.value = initial
	fallbackLocale.value = fb
	globalMessages = messages

	return {
		install(app) {
			// Normal functions, NOT arrows: they need `this` to be the component instance so they can
			// reach its own i18n option. That covers every shape in this codebase - template mustache,
			// this.$t(), the vm proxy in poll-edit's route guard, and getCurrentInstance().proxy.$t().
			app.config.globalProperties.$t = function (key, params) {
				return translate(key, params, localMessagesOf(this))
			}
			app.config.globalProperties.$tc = function (key, count, params) {
				return translatePlural(key, count, params, localMessagesOf(this))
			}
			app.config.globalProperties.$d = formatDate
			app.config.globalProperties.$fromNow = fromNow
		},
	}
}
