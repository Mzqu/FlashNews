var express = require('express');
var router = express.Router();
var request = require('request'); // "Request" library
var cheerio = require('cheerio');
var querystring = require('querystring');

var AYLIENTextAPI = require('aylien_textapi');
var textapi = new AYLIENTextAPI({
  application_id: "fd181d11",
  application_key: "fee82246be3730121c8fbbe4a8d29096"
});

var appKey = '329e0edbe8bf844a01ee3f5bb7475a19';

var timeValues = {
  'seconds': 1,
  'secondsAMPM': 1,
  'minutes': 2,
  'minutesAMPM': 2,
  'hour': 3,
  'hourAMPM': 3,
  'day': 4,
  'weekday': 4.5,
  'month': 5,
  'year': 6,
  'century': 7
}

var maxWhoCount = 3;
var maxWhereCount = 3;

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });

});

//NOTE: req.query.url is allowed to be blank, fix or implement error
router.get('/result', function(req, res, next) {

  textapi.language({
    url: req.query.url
  }, function(error, response) {
    if (error === null) {
      textapi.extract({
        url: req.query.url,
        best_image: true,
        language: response.lang
      }, function(error, response) {
        if (error === null) {
          var text = response.article;
          var header = response.title;
          var when = response.publishDate;

          textapi.summarize({
            url: req.query.url,
            sentences_number: 3
          }, function(error, response) {
            if (error === null) {
              var options = {
                url: 'http://api.meaningcloud.com/topics-2.0?',
                form: {
                  key: appKey,
                  of: 'json',
                  lang: 'en',
                  ilang: 'en',
                  uw: 'y',
                  tt: 'a',
                  txt: text
                },
              };

              var sentences = "";
              response.sentences.forEach(function(s) {
                sentences += s + " ";
              })

              request.post(options, function(error, response, body) {
                if (!error && response.statusCode === 200) {
                  var who = "";
                  var whoCount = 0;
                  var what = "";
                  var where = "";
                  var whereCount = 0;

                  var json = JSON.parse(response.body);
                  for (var i = 0; i < json.entity_list.length; i++) {
                    var arr = json.entity_list[i].sementity.type.split(">");
                    if (i == 0) {
                      who += json.entity_list[i].form;
                      whoCount += 1;
                      continue;
                    }
                    for (var j = 0; j < arr.length; j++) {
                      if (arr[j] === "Person" || arr[j] === "Organization") {
                        if (whoCount < maxWhoCount) {
                          if (who.length > 0) {
                            who += ", " + json.entity_list[i].form;
                          }
                          else {
                            who = json.entity_list[i].form;
                          }
                          whoCount += 1;
                        }
                      } else if (arr[j] === "Location" || arr[j] === "Organization") {
                        if (json.entity_list[i].form[0] === json.entity_list[i].form[0].toUpperCase()) {
                          if (where.length == 0) {
                            where = json.entity_list[i].form;
                            whereCount += 1;
                          }
                        }
                      }
                    }
                  }

                  for (var i = 0; i < json.concept_list.length; i++) {
                    var arr = json.concept_list[i].sementity.type.split(">");
                    for (var j = 0; j < arr.length; j++) {
                      if (arr[j] === "Location") {
                        if (json.concept_list[i].form[0] == json.concept_list[i].form[0].toUpperCase()) {
                          if (whereCount < maxWhereCount) {
                            if (where.length > 0) {
                              where += ", " + json.concept_list[i].form;
                            }
                            else {
                              where = json.concept_list[i].form;
                            }
                            whereCount += 1;
                          }
                        }
                      }
                      else {
                        if (what.length == 0) {
                          what = json.concept_list[i].form;
                        }
                      }
                    }
                  }
                  if (where.length == 0) {
                    where = "Unspecified";
                  }
                  if (who.length == 0) {
                    who = "Unspecified";
                  }
                  if (when.length == 0) {
                    when = "Unspecified";
                  }
                  if (what.length == 0) {
                    what = "Unspecified";
                  }
                  if (sentences.length == 0) {
                    sentences = "No Article";
                  }
                  if (header.length == 0) {
                    header = "No Title";
                  }

                  res.render('result', {body: {title: header, summary: sentences, who: who, what: what, where: where, when: when}});
                }
              });
            }
          });
        }
      });
    }
  });
});

module.exports = router;
