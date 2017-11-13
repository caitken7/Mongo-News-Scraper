// Scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Requiring our Comment and Article models
var Comment = require("../models/Comment.js");
var Article = require("../models/Article.js");

module.exports = function(app) {
  app.get("/", function(req, res) {
    res.redirect("/articles");
  });

  app.get("/scrape", function(req, res) {
    request("https://www.reddit.com/r/NewsPorn/", function(
      error,
      response,
      html
    ) {
      // Load the HTML into cheerio and save it to a variable
      // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
      var $ = cheerio.load(html);

      // Select each element in the HTML body from which you want information.
      // NOTE: Cheerio selectors function similarly to jQuery's selectors,
      // but be sure to visit the package's npm page to see how it works
      $(".entry a.title").each(function(i, element) {
        var link = $(element).attr("href");
        var title = $(element).text();

        if (title && link && title != "Reddit 101") {
          // An empty object to save the data that we'll scrape
          var result = {};

          // Save these results in an object that we'll push into the results array we defined earlier
          result.title = title;
          result.link = link;

          // Using our Article model, create a new entry
          Article.create(result, function(err, doc) {
            // Log any errors
            if (err) {
              console.log(err);
            } else {
              console.log(doc);
            }
          });
        }
      }).then;
    });
    // Tell the browser that we finished scraping the text
    res.redirect("/");
  });

  // This will get the articles we scraped from the mongoDB
  app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
      // Log any errors
      if (error) {
        console.log(
          error // Or send the doc to the browser as a json object
        );
      } else {
        res.render("index", { result: doc });
      }
      //Will sort the articles by most recent
    }).sort({ _id: 1 });
  });

  // Grab an article by it's ObjectId
  app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the
    // matching one in our db...
    Article.findOne({ _id: req.params.id })
      // ..and populate all of the comments associated with it
      .populate("comment")
      // now, execute our query
      .exec(function(error, doc) {
        // Log any errors
        if (error) {
          console.log(
            error // Otherwise, send the doc to the browser as a json object
          );
        } else {
          res.render("comments", { result: doc });
          // res.json (doc);
        }
      });
  });

  // Create a new comment
  app.post("/articles/:id", function(req, res) {
    // Create a new Comment and pass the req.body to the entry
    Comment.create(req.body, function(error, doc) {
      // Log any errors
      if (error) {
        console.log(
          error // Otherwise
        );
      } else {
        // Use the article id to find and update it's comment
        Article.findOneAndUpdate(
          {
            _id: req.params.id
          },
          {
            $push: {
              comment: doc._id
            }
          },
          {
            safe: true,
            upsert: true,
            new: true
          }
        )
          // Execute the above query
          .exec(function(err, doc) {
            // Log any errors
            if (err) {
              console.log(err);
            } else {
              // Or send the document to the browser
              res.redirect("back");
            }
          });
      }
    });
  });

  app.delete("/articles/:id/:commentid", function(req, res) {
    Comment.findByIdAndRemove(req.params.commentid, function(error, doc) {
      // Log any errors
      if (error) {
        console.log(
          error // Otherwise
        );
      } else {
        console.log(doc);
        Article.findOneAndUpdate(
          {
            _id: req.params.id
          },
          {
            $pull: {
              comment: doc._id
            }
          }
        )
          // Execute the above query
          .exec(function(err, doc) {
            // Log any errors
            if (err) {
              console.log(err);
            }
          });
      }
    });
  });
};
