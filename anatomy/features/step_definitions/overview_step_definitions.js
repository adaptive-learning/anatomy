/* global browser, element, by */
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
var expect = chai.expect;

module.exports = function() {
  this.setDefaultTimeout(20 * 1000);

  this.Given(/^I go to "([^"]*)"$/, function(url, callback) {
    browser.ignoreSynchronization = true;

    if (url.substr(0, 4) != 'http') {
      url = browser.params.baseURL + url;
    }

    browser.get(url)
     .then(function() {setTimeout(callback, 1000);});
  });

   this.Then(/^I should see a question$/, function (callback) {
    setTimeout(function() {
      var rows = element.all(by.css('.question'));
      expect(rows.count()).to.eventually.equal(1);
      callback();
    }, 3000);
   });

  this.Then(/^I should see "([^"]*)"$/, function (text, callback) {
    var body = element(by.css('body'));
    body.getText().then(function(bodyContent){
      expect(bodyContent).to.contain(text);
      callback();
    });
  });

  this.Then(/^I should see "([^"]*)" tiles$/, function (count, callback) {
    var rows = element.all(by.css('.tile'));
    expect(rows.count()).to.eventually.equal(parseInt(count, 10));
    callback();
  });

};
