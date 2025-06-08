// Wait for the DOM to be ready
$(function() {
    // This function is called after navbar.html is loaded
    function initMobileMenu() {
        const mobileMenuButton = $('#mobile-menu-button');
        const mobileMenu = $('#mobile-menu');

        if (mobileMenuButton.length && mobileMenu.length) {
            mobileMenuButton.on('click', function() {
                mobileMenu.toggleClass('hidden');
            });
        }
    }
    
    // Check if the navbar container exists and load the navbar
    if ($('#navbar-container').length) {
         $('#navbar-container').load('/navbar.html', initMobileMenu);
    }
});