<template>
	<div class="container">
		<h1 id="NotFoundPage">Uuupss!</h1>
		<p>{{ $t('NotFound') }}</p>
		<a href="/" class="btn btn-primary">{{ $t('StartOver') }}</a>
		<a href="/login" class="btn btn-primary ms-3">{{ $t('Login') }}</a>
	</div>
</template>

<script>
export default {
	name: "NotFoundPage",
	i18n: {
		messages: {
			de: {
				NotFound: "This page could not be found. Sorry.",
				StartOver: "Start over"
			}
		}
	},
	components: {},
	data() {
		return {}
	},
	computed: {},
	created() {},
	methods: {},
}
</script>

<style lang="scss" scoped></style>
