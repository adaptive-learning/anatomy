describe('homepage', function() {
  it('should load', function() {
    browser.get('http://localhost:8000');

    var header = element(by.css('h1'));

    // Assert that the text element has the expected value.
    // Protractor patches 'expect' to understand promises.
    expect(header.getText()).toEqual('Slepé Mapy');
  });
});

describe('practice page', function() {
  it('should work', function() {
    browser.get('http://localhost:8000/#/practice/world/state');

    var dontKnow = element(by.css('.dont-know'));
    var next = element(by.css('.next'));
    expect(next.getAttribute('disabled')).toBeTruthy();

    dontKnow.click();
    expect(next.getAttribute('disabled')).toBeNull();

    next.click();
    expect(next.getAttribute('disabled')).toBeTruthy();

  });
});
