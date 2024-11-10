let splicedURL = window.location.href.split("/");
let currentTicket = splicedURL.pop();

// Scrolls to the currently selected ticket
$('#tickets').scrollTop($("#" + currentTicket).offset().top - 200);