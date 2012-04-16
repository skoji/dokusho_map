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
		var idval = 1;
		var books = {};

		function renderTweet(elem, item) {
			elem.append($("<li />").append($("<img />").attr("src", item.profile_image_url)).
						append($("<span />").append("@" + item.from_user + ":" +   item.text)));
		}
		
		function draw() {
			var map_id = "result";
			
			var visual_style = {
                nodes: {
                    shape: "ROUNDRECT",
                    size: "auto",
                },
                edges: {
                    width: 2,
                }
            };

			var networ_json = {
                dataSchema: {
                    nodes: [ { name: "label", type: "string" },
                           ],
                    edges: [ { name: "label", type: "string" }
                           ]
                },
				data: {
					nodes: [ ],
					edges: [ ]
				}
			};

			var id_before = idval + "";
			$.each(parsed, function(i, p) {
				$.each(p, function(i, elem) {
					if (elem.type == 'node') {
						networ_json.data.nodes.push({id: elem.id, label: elem.label + "\n" + elem.author});
					} else {
						networ_json.data.edges.push({id: elem.source + "-" + elem.target,
													 label: elem.label,
													 source: elem.source,
													 target: elem.target
													});
					}
				});
			});

			console.log(JSON.stringify(networ_json.data.nodes));
			console.log(JSON.stringify(networ_json.data.edges));

			var options = {
				swfPath: "cytoscape_web/swf/CytoscapeWeb",
				flashInstallerPath: "cytoscape_web/swf/playerProductInstall"
			};
			
			var vis = new org.cytoscapeweb.Visualization(map_id, options);
			vis.draw({ network: networ_json,
					   edgeLabelsVisible: true,
					   visualStyle: visual_style,
					   layout: { name: "ForceDirected", options: { autoStabilize: false, restLength: 10 }}
					 });

		}
		function done(word) {
			$.each(tweets.reverse(), function(i,item) {
				parse(item,word);
			});

			$.each(parsed, function(i, p) {
				$("#result-text").append($("<li />")
									.append($("<span />").append(JSON.stringify(p))));
				console.log(JSON.stringify(p));
			});
			
			$.each(used, function(i, item) {
				renderTweet($("#used"),item);
			});
			$.each(rejected, function(i,item) {
				renderTweet($("#rejected"),item);
			});
			$("#result-title").text(word);
			$("#used-title").text("「" + word + "」図の作成に使ったツイート");
			$("#rejected-title").text("「"+ word + "」図の作成に使わなかったツイート");

			draw();
		}

		var ascii = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@-.,:';
		var zenkaku = '１２３４５６７８９０ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ＠－．，：';

		function normalize(item) {
			var str = item.text;
			$.each(zenkaku, function(i, z) {
				str = str.replace(new RegExp(z,"gm"),ascii[i]);
			});
			item.text = str;
		}
			
		function handleSpecialCase(item, word) {
			item.text = item.text.replace("星の王子様","星の王子さま");
			item.text = item.text.replace("（「!!」は見逃してください）", "");
			item.text = item.text.replace("『蠅の王』／『豚の死なない日』","『豚の死なない日』");
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

			normalize(item);
	 		var text = item.text;
			while (text.indexOf('RT') >= 0) {
				text = item.text.replace(/RT.*$/,'');
			}
			while (text.indexOf('QT') >= 0) {
	 			text = item.text.replace(/QT.*$/,'');
			}
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
				var id_before;
				var edge_before;
				arr = $.map(arr, function(str, index) {
					if (index % 2 == 0) {
						var m = str.match(/[「『](.*)[」』](\(.*\))?/);
						if (m) {
							var label = m[1].trim();
							if (books[label]) {
								if (edge_before) {
									edge_before.target = books[label];
								}
								edge_before = null;
								id_before = books[label];
							} else {
								var author = m[2] ? m[2].trim() : "";
								var id =  "" + idval ++;
								books[label] = id;
								var node = { type: 'node', label: label, author: author, id: id };
								id_before = id;
								if (edge_before) {
									edge_before.target = id;
								}
								edge_before = null;
								return node;
							}
						} else {
							console.log("パース失敗");
						}
					} else {
						return edge_before = { type: 'edge', label: str.trim(), source: id_before};
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
