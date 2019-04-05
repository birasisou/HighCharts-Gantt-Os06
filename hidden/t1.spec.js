describe("A suite", function() {
  var player;

  it("contains spec with an expectation (Is true true ???)", function() {
    expect(true).toBe(true);
  });

  it("tries to test the not-imported Player.js file", function() {
    player = new Player();
    expect(player.isPlaying).toBe(undefined);
    expect(player.isPlaying).not.toBe(false);
  });
});