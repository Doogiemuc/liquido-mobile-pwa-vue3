/**
 * <h1>A small HTML sanitiser for translated messages</h1>
 *
 * Some LIQUIDO messages legitimately contain markup - `<b>`, `<a href='/'>`, `<i class='fas ...'>`,
 * the `<span class='liquido'>` badge - and those have to reach the DOM intact. Everything else must
 * not.
 *
 * <h2>Why parse instead of regex</h2>
 *
 * HTML is not a regular language; a regex sanitiser is a well-known way to ship an XSS hole
 * (`<img src=x onerror=...>`, unclosed tags, entity tricks). Here the browser's own parser does the
 * parsing and we walk the resulting tree, which cannot be fooled about what a tag or attribute
 * actually is. It costs nothing - this runs on a handful of short strings.
 *
 * <h2>How strict</h2>
 *
 * Deliberately generous. Every translation in LIQUIDO is written by hand and lives in the repo -
 * none of it comes from a user - so this is a backstop against a mistake, not a trust boundary.
 * The real protection is that {@link module:liqui-loc.translate} escapes interpolated parameter
 * values BEFORE they are substituted, so a user-supplied team name can never contribute markup in
 * the first place.
 */

/** Tags a message may use. Everything else is unwrapped (its text is kept, the tag is dropped). */
const ALLOWED_TAGS = new Set([
	"B", "STRONG", "I", "EM", "U", "S", "SMALL", "SPAN", "P", "BR", "HR",
	"H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "A", "DIV",
])

/** Attributes allowed on any permitted tag. */
const ALLOWED_ATTRS = new Set(["class", "style"])

/** Extra attributes allowed only on <a>. */
const ALLOWED_A_ATTRS = new Set(["href", "target", "rel"])

/** Schemes an <a href> may use. Blocks javascript: and data:. */
const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i

/**
 * Escape text so it can be embedded in HTML as literal characters.
 * Used on interpolated PARAMETER VALUES - never on the message itself, whose markup is the point.
 *
 * @param {*} value anything; coerced to String
 * @returns {String} HTML-safe text
 */
export function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
}

/**
 * Strip everything from `html` that is not on the allowlist.
 *
 * Disallowed elements are UNWRAPPED rather than deleted, so their text survives: a stray `<table>`
 * loses its tag but the sentence inside it still reads. `<script>` and `<style>` are the exception -
 * their content is markup, not prose, so both go entirely.
 *
 * @param {String} html the interpolated message
 * @returns {String} sanitised HTML, safe for v-html
 */
export function sanitizeHtml(html) {
	if (!html) return ""
	const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
	clean(doc.body)
	return doc.body.innerHTML
}

/** Walk depth-first over a live NodeList, so removals during iteration are handled. */
function clean(node) {
	for (const child of [...node.childNodes]) {
		if (child.nodeType === 3 /* text */) continue
		if (child.nodeType !== 1 /* element */) { child.remove(); continue }   // comments, CDATA, ...

		const tag = child.tagName.toUpperCase()

		// Content of these is code, not prose - drop the whole subtree.
		if (tag === "SCRIPT" || tag === "STYLE") { child.remove(); continue }

		if (!ALLOWED_TAGS.has(tag)) {
			clean(child)                       // keep the text inside, lose the tag
			child.replaceWith(...child.childNodes)
			continue
		}

		for (const attr of [...child.attributes]) {
			const name = attr.name.toLowerCase()
			const allowed = ALLOWED_ATTRS.has(name) || (tag === "A" && ALLOWED_A_ATTRS.has(name))
			// on* handlers are the whole reason this loop exists; they are never allowed.
			if (!allowed || name.startsWith("on")) { child.removeAttribute(attr.name); continue }
			if (tag === "A" && name === "href" && !SAFE_HREF.test(attr.value.trim())) {
				child.removeAttribute(attr.name)
			}
		}
		clean(child)
	}
}
