# map-generator
Generates json files for Tiled and Phaser using a cellular automata algorithm.

Edit the starting variables in app.js to set the tile ids for the "empty" and "solid" cells of the automata. Here you can also set the birth and death rate and number of simulation steps. You'll also see how to place arbitrary solid objects.

run `node app.js` and you'll get a generated-map.json file that can be imported into Phaser or opened and edited further with Tiled.
