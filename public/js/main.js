$(document).ready(function() {
    // Load Navbar and Footer
    $('#navbar-container').load('/navbar.html');
    $('#footer-container').load('/footer.html');

    // FAQ Accordion
    $('.faq-question').on('click', function() {
        $('.faq-answer').not($(this).next()).slideUp(300);
        $('.faq-question').not(this).removeClass('open');
        $(this).next('.faq-answer').slideToggle(300);
        $(this).toggleClass('open');
    });

    // --- WIDGET LOGIC ---

    async function initializeRampWidget() {
        try {
            // Fetch the API key from our secure backend endpoint
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error('Could not fetch configuration');
            }
            const config = await response.json();
            const apiKey = config.apiKey;

            if (!apiKey || apiKey === 'your_rampnow_api_key_goes_here') {
                throw new Error("API Key not configured in .env file.");
            }

            // Construct the widget URL
            const rampURL = new URL('https://app.rampnow.io/order/quote');
            rampURL.searchParams.set('apiKey', apiKey);
            rampURL.searchParams.set('dstCurrency', 'PLS');
            rampURL.searchParams.set('dstChain', 'pulse-chain');
            // --- START: CORRECTION ---
            rampURL.searchParams.set('orderType', 'buy'); // Corrected from search_params
            // --- END: CORRECTION ---

            const iframe = $('#rampnow-iframe');
            iframe.attr('src', rampURL.toString());
            
            iframe.on('load', function() {
                // Fade out the loading overlay once the iframe content is loaded
                $('#loading-overlay').fadeOut(300);
            });

        } catch (error) {
            console.error('Failed to initialize Rampnow widget:', error);
            $('#loading-overlay').html(`<p class="text-red-400 p-4">${error.message}</p>`);
        }
    }

    // Directly initialize the widget for all users
    initializeRampWidget();

});