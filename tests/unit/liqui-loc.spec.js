import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
	createLoc, translate, translatePlural, formatDate, fromNow,
	locale, setLocale, t,
} from "@/services/liqui-loc.js"
import { escapeHtml, sanitizeHtml } from "@/services/liqui-loc-sanitize.js"

/** The component-local catalogue shape: exactly what an `i18n: { messages }` option holds. */
const local = {
	de: { greeting: "Hallo {name}", localOnly: "nur lokal", Loading: "Lädt..." },
	en: { greeting: "Hello {name}", localOnly: "local only" },
}

beforeEach(() => {
	createLoc({
		locale: "de",
		fallbackLocale: "de",
		messages: {
			de: { Loading: "Lade ...", globalOnly: "nur global", plural: "0 Dinge | 1 Ding | {n} Dinge" },
			en: { Loading: "Loading ...", globalOnly: "global only" },
		},
	})
})

describe("lookup order", () => {
	it("prefers the component's own message over the global one", () => {
		// Load-bearing: several components deliberately redefine a global key with different text.
		expect(translate("Loading", undefined, local)).toBe("Lädt...")
		expect(translate("Loading")).toBe("Lade ...")
	})

	it("falls through to the global catalogue when the component has no such key", () => {
		expect(translate("globalOnly", undefined, local)).toBe("nur global")
	})

	it("falls back to the fallback locale when the active one lacks the key", () => {
		setLocale("en")
		// "localOnly" exists in en, but "Lädt..." style keys may not - check a global fallback case
		expect(translate("localOnly", undefined, local)).toBe("local only")
		setLocale("de")
	})

	it("returns the key itself when nothing has it, so the gap is visible", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {})
		expect(translate("noSuchKey")).toBe("noSuchKey")
	})

	it("warns once per missing key, not once per call", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		translate("alsoMissing"); translate("alsoMissing"); translate("alsoMissing")
		expect(warn).toHaveBeenCalledTimes(1)
	})
})

describe("interpolation", () => {
	it("replaces {placeholders} by name", () => {
		expect(translate("greeting", { name: "Robert" }, local)).toBe("Hallo Robert")
	})

	it("leaves an unmatched placeholder standing rather than blanking it", () => {
		// A visible {name} points at the bug; an empty gap hides it.
		expect(translate("greeting", { other: "x" }, local)).toBe("Hallo {name}")
	})

	it("does NOT escape - t() is plain text and Vue escapes it on render", () => {
		expect(translate("greeting", { name: "<b>x</b>" }, local)).toBe("Hallo <b>x</b>")
	})

	it("warns when handed a number instead of params (the old $t(key, 1) bug)", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
		translate("greeting", 1, local)
		expect(warn).toHaveBeenCalled()
	})
})

describe("pluralisation", () => {
	it("selects zero | one | other exactly as vue-i18n did", () => {
		expect(translatePlural("plural", 0)).toBe("0 Dinge")
		expect(translatePlural("plural", 1)).toBe("1 Ding")
		expect(translatePlural("plural", 7)).toBe("7 Dinge")
	})

	it("exposes the count as {n}", () => {
		expect(translatePlural("plural", 42)).toContain("42")
	})

	it("handles a two-form message as one | other", () => {
		const two = { de: { two: "ein Ding | {n} Dinge" } }
		expect(translatePlural("two", 1, undefined, two)).toBe("ein Ding")
		expect(translatePlural("two", 3, undefined, two)).toBe("3 Dinge")
	})
})

describe("dates", () => {
	it("formats DD.MM.YYYY in German, zero padded", () => {
		// The padding is the whole point: plain toLocaleDateString gives "5.8.2026".
		expect(formatDate(new Date(2026, 7, 5))).toBe("05.08.2026")
	})

	it("formats MM/DD/YYYY in English", () => {
		setLocale("en")
		expect(formatDate(new Date(2026, 7, 5))).toBe("08/05/2026")
		setLocale("de")
	})

	it("returns an empty string for an unparseable date rather than 'Invalid Date'", () => {
		expect(formatDate("not a date")).toBe("")
	})
})

describe("relative time", () => {
	const inDays = n => new Date(Date.now() + n * 86400000)

	it("describes the future and the past", () => {
		expect(fromNow(inDays(5))).toBe("in 5 Tagen")
		expect(fromNow(inDays(-3))).toBe("vor 3 Tagen")
	})

	it("uses words where the locale has them", () => {
		expect(fromNow(inDays(-1))).toBe("gestern")
	})

	it("picks a sensible unit across the range", () => {
		expect(fromNow(new Date(Date.now() + 2 * 3600000))).toBe("in 2 Stunden")
		expect(fromNow(new Date(Date.now() + 200 * 86400000))).toMatch(/Monaten/)
		expect(fromNow(new Date(Date.now() + 800 * 86400000))).toMatch(/Jahr/)
	})

	it("localises", () => {
		setLocale("en")
		expect(fromNow(inDays(5))).toBe("in 5 days")
		setLocale("de")
	})
})

describe("module-level t() for use outside components", () => {
	it("resolves global keys", () => {
		expect(t("globalOnly")).toBe("nur global")
	})
})

describe("locale is reactive", () => {
	afterEach(() => setLocale("de"))
	it("setLocale changes the ref, which is what re-renders templates", () => {
		expect(locale.value).toBe("de")
		setLocale("en")
		expect(locale.value).toBe("en")
		expect(translate("globalOnly")).toBe("global only")
	})
})

describe("escapeHtml", () => {
	it("neutralises every character that could open a tag or attribute", () => {
		expect(escapeHtml(`<img src=x onerror="alert(1)">`))
			.toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
		expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s")
	})
})

describe("sanitizeHtml", () => {
	it("keeps the formatting tags real messages use", () => {
		const html = `<p>a <b>b</b> <em>c</em><br/><i class="fas fa-x"></i><span class="liquido"></span></p>`
		const out = sanitizeHtml(html)
		expect(out).toContain("<b>b</b>")
		expect(out).toContain("<em>c</em>")
		expect(out).toContain('class="fas fa-x"')
		expect(out).toContain('class="liquido"')
	})

	it("removes a script element entirely, content and all", () => {
		expect(sanitizeHtml('ok<script>alert(1)</' + 'script>')).toBe("ok")
	})

	it("strips on* handlers but keeps the element", () => {
		const out = sanitizeHtml('<span onerror="alert(1)" onclick="x()" class="c">hi</span>')
		expect(out).not.toContain("onerror")
		expect(out).not.toContain("onclick")
		expect(out).toContain('class="c"')
		expect(out).toContain("hi")
	})

	it("drops a javascript: href but keeps the link text", () => {
		const out = sanitizeHtml(`<a href="javascript:alert(1)">click</a>`)
		expect(out).not.toContain("javascript:")
		expect(out).toContain("click")
	})

	it("keeps ordinary hrefs", () => {
		expect(sanitizeHtml(`<a href="/team">go</a>`)).toContain('href="/team"')
	})

	it("unwraps a disallowed tag but keeps its text", () => {
		// Losing the sentence would be worse than losing the tag.
		expect(sanitizeHtml("<table><tr><td>keep me</td></tr></table>")).toContain("keep me")
		expect(sanitizeHtml("<table><tr><td>keep me</td></tr></table>")).not.toContain("<table")
	})

	it("survives malformed markup without throwing", () => {
		expect(() => sanitizeHtml("<b>unclosed <i>nested")).not.toThrow()
	})
})

// ---------------------------------------------------------------------------
// The <liqui-loc-html> component. Mounted for real, because the interesting
// behaviour is the ORDER of escape -> interpolate -> sanitize.
// ---------------------------------------------------------------------------
import { mount } from "@vue/test-utils"
import LiquiLocHtml from "@/components/liqui-loc-html.vue"

describe("<liqui-loc-html>", () => {
	beforeEach(() => {
		createLoc({
			locale: "de", fallbackLocale: "de",
			messages: { de: {
				rich: "Hallo <b>{name}</b>, willkommen bei <span class='liquido'></span>!",
				plainish: "<p>ein <em>Absatz</em></p>",
			} },
		})
	})

	it("renders the message's own HTML", () => {
		const w = mount(LiquiLocHtml, { props: { msgKey: "plainish" } })
		expect(w.html()).toContain("<em>Absatz</em>")
	})

	it("renders the requested tag and passes attributes through", () => {
		// The e2e suite selects on ids like #onlyAdminAddsProposalsInfo, so these must survive.
		const w = mount(LiquiLocHtml, {
			props: { msgKey: "plainish", tag: "div" },
			attrs: { id: "someId", class: "alert" },
		})
		expect(w.element.tagName).toBe("DIV")
		expect(w.attributes("id")).toBe("someId")
		expect(w.attributes("class")).toContain("alert")
	})

	it("SECURITY: a param cannot introduce markup, even into an HTML message", () => {
		// This is the whole reason params are escaped BEFORE interpolation. A team named like this
		// went straight into v-html under vue-i18n.
		const w = mount(LiquiLocHtml, {
			props: { msgKey: "rich", params: { name: '<img src=x onerror="alert(1)">' } },
		})
		// Assert on the DOM, not the string: the escaped text legitimately CONTAINS the characters
		// "onerror" - as literal text a user reads, not as an attribute the browser acts on. What
		// matters is that no element was created.
		expect(w.find("img").exists()).toBe(false)
		expect(w.element.querySelectorAll("*").length).toBe(2)   // only the message's own <b> and <span>
		expect(w.html()).toContain("&lt;img")                    // it survives as visible literal text
		expect(w.html()).toContain('class="liquido"')            // the message's own markup still works
	})

	it("keeps the message's HTML while escaping the param, in one render", () => {
		const w = mount(LiquiLocHtml, { props: { msgKey: "rich", params: { name: "Robert & Co" } } })
		expect(w.html()).toContain("<b>Robert &amp; Co</b>")
	})
})
