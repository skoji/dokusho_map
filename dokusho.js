$(function() {
  $("input#go").click(function() {
      if ($("input#keyword").val().length) {
	  $("#result").empty();
	  search("#読書地図" + $("input#keyword").val(),1);
    } else {
      return false;
    }
  });
});

function search(word, page) {
    $.ajax({
      	type: "GET",
	url: "http://search.twitter.com/search.json",
	data: {
	    "q": word,
	    "page": page,
	    "rpp": 100
	},
	dataType: "jsonp",
	success: function(data) {
	    $.each(data.results, function(i, item) {
		$("#result").append($("<li />")
				    .append($("<span />").append(item.text))
				   );
	    });
	    if (page < 15 && data.results.length > 0)
		search(word, page + 1);
	    else 
		done();
	}
    });
}

function done() {
    alert("all or 1500 tweets read.");
}