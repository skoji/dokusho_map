$(function() {
	$("input#go").click(function() {
		if ($("input#keyword").val().length) {
			$("#result").empty();
			dokusho.clear();
			dokusho.search($("input#keyword").val(),1);
		} else {
			return false;
		}
	});

});

String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g, "");
}

if (!console) {
	var console = { log: function(){} };
}

var dokusho = (
	function() {
		var maindata = {
			rootbook: "",
			tweets: [],
			used:  [],
			rejected: [],
			idval:1,
			books:{},
			clear: function() {
				this.rootbook = "";
				this.tweets =  [];
				this.parsed = [];
				this.used =  [];
				this.rejected = [];
				this.idval = 1;
				this.books = {};
			}
		}

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
					color: { discreteMapper:
							 { attrName: "bookname",
							   entries: [ { attrValue: maindata.rootbook, value: "#AA4400" }]
							 }
						   },
					labelFontSize: {
						discreteMapper:
						{ attrName: "bookname",
						  entries: [ { attrValue: maindata.rootbook, value: 13 }]
						}
					},
					labelFontWeight: {
						discreteMapper:
						{ attrName: "bookname",
						  entries: [ { attrValue: maindata.rootbook, value: "bold" }]
						}
					}

                },
                edges: {
                    width: 2,
                }
            };

			var networ_json = {
                dataSchema: {
                    nodes: [ { name: "label", type: "string" },
							 { name: "bookname", type: "string" }
                           ],
                    edges: [ { name: "label", type: "string" }
                           ]
                },
				data: {
					nodes: [ ],
					edges: [ ]
				}
			};

			var id_before = maindata.idval + "";
			$.each(maindata.parsed, function(i, p) {
				$.each(p, function(i, elem) {
					if (elem.type == 'node') {
						networ_json.data.nodes.push({id: elem.id, label: elem.label + "\n" + elem.author, bookname: elem.label });
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
		function done(word, rootbook) {
			maindata.rootbook = rootbook;
			maindata.tweets = maindata.tweets.reverse();
			$.each(maindata.tweets, function(i,item) {
				parse(item,word);
			});

			$.each(maindata.parsed, function(i, p) {
				$("#result-text").append($("<li />")
										 .append($("<span />").append(JSON.stringify(p))));
				console.log(JSON.stringify(p));
			});
			
			$.each(maindata.used, function(i, item) {
				renderTweet($("#used"),item);
			});
			$.each(maindata.rejected, function(i,item) {
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
				maindata.rejected.push(item);
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
					maindata.rejected.push(item);
			} else {
				var id_before;
				var edge_before;
				arr = $.map(arr, function(str, index) {
					if (index % 2 == 0) {
						var m = str.match(/[「『](.*)[」』](\(.*\))?/);
						if (m) {
							var label = m[1].trim();
							if (maindata.books[label]) {
								if (edge_before) {
									edge_before.target = maindata.books[label];
								}
								edge_before = null;
								id_before = maindata.books[label];
							} else {
								var author = m[2] ? m[2].trim() : "";
								var id =  "" + maindata.idval ++;
								maindata.books[label] = id;
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
				maindata.used.push(item);
				maindata.parsed.push(arr);
			}
		}
		
		return {
			clear: function() {
				maindata.clear();
			},
			search: function(rootbook, page) {
				word = "#読書地図" + rootbook;
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
							maindata.tweets.push(item)
						});
						if (page < 15 && data.results.length > 0)
							that.search(rootbook, page + 1);
						else 
							done(word, rootbook);
					}
				});
			},
		};
	}
)();
