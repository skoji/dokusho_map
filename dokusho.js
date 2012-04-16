$(function() {
  $("input#go").click(function() {
      if ($("input#keyword").val().length) {
	  $("#result").empty();
	  dokusho.search("#読書地図" + $("input#keyword").val(),1);
    } else {
      return false;
    }
  });
});

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g, "");
}

var dokusho = (
	function() {
		var tweets =  [];
		var parsed = [];
		var used =  [];
		var rejected = [];

		function renderTweet(elem, item) {
			elem.append($("<li />").append($("<img />").attr("src", item.profile_image_url)).
						append($("<span />").append("@" + item.from_user + ":" +   item.text)));
		}
		
		function done(word) {
			$.each(tweets, function(i,item) {
				parse(item,word);
			});

			$.each(parsed, function(i, p) {
				$("#result").append($("<li />")
									.append($("<span />").append(JSON.stringify(p))));
			});
			$.each(used, function(i, item) {
				renderTweet($("#used"),item);
			});
			$.each(rejected, function(i,item) {
				renderTweet($("#rejected"),item);
			});
		}

		function handleSpecialCase(item, word) {
			if (item.text.trim().indexOf("『そして誰もいなくなった』（アガサ・クリスティ）→孤島殺人→『髑髏島の殺人』（マイケル・スレイド）　#読書地図そして誰もいなくなった") == 0) {
				item.text = item.text.replace(/髑髏島の殺人/,"髑髏島の惨劇");
				return true;
			}
			if (item.text.indexOf("間違えた、『髑髏島の") == 0) {
				return false;
			}
			return true;
		}
	 	
		function parse(item, word) {
			if (!handleSpecialCase(item, word)) {
				rejected.push(item);
				return
			}



	 		var text = item.text.replace(/RT.*$/,'');
	 		var text = item.text.replace(/QT.*$/,'');
			text = text.replace(/（/g,"(");
			text = text.replace(/）/g,")");

			$.each([new RegExp(word, "g"), /\(既出\)/g, /【既出】/g,/（既出）/g ],
				   function() {
					   text = text.replace(this, "");
				   });
			
			var arr =  text.split('→');
			if (arr.length < 3 || arr.length % 2 == 0) {
				if (item.text.indexOf("RT") != 0)
					rejected.push(item);
			} else {
				arr = $.map(arr, function(str, index) {
					console.log(str);
					if (index % 2 == 0) {
						var m = str.match(/[「『](.*)[」』](\(.*\))?/);
						if (m) {
							return { type: 'node', label: m[1].trim(), author: m[2] ? m[2].trim() : "" };
						} else {
							console.log("パース失敗");
						}
					} else {
						return { type: 'edge', label: str.trim()};
					}
				});
				used.push(item);
				parsed.push(arr);
			}
		}
		
		return {
			search: function(word, page) {
				var that = this;
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
							tweets.push(item)
						});
						if (page < 15 && data.results.length > 0)
							that.search(word, page + 1);
						else 
							done(word);
					}
				});
			},
		};
	}
)();
