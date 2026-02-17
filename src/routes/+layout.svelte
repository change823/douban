<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
    <meta name="referrer" content="no-referrer" />
</svelte:head>

{@render children()}
