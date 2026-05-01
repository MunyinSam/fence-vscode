async function fetchData() {
    try {
        const result = await fetch('https://example.com');
        return result;
    } catch (e) {
        console.error(e);
    }
}
