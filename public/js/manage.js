
$(document).ready(function(){
  $("#userInput").on("keyup", function() {
	  $('.show').removeClass("show")
	  var value = $(this).val().toLowerCase();
	  $("#usercard").filter(function() {
		  $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
	  });
  });
});


