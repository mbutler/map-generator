let _ = require('lodash')
let Array2d = require('array-2d')
var chanceToStartAlive = 0.50
var worldWidth = 100
var worldHeight = 100
var empty = 7
var solid = 1
var numberOfSteps = 7
var birthLimit = 4
var deathLimit = 2

function generateMap() {
    //So, first we make the map
    var map = [
            []
        ]
        //And randomly scatter solid blocks
    initialiseMap(map)

    //Then, for a number of steps
    for (var i = 0; i < numberOfSteps; i++) {
        //We apply our simulation rules!
        map = doSimulationStep(map)
    }
    //And we're done!
    return map
}

function initialiseMap(map) {
    for (var x = 0; x < worldWidth; x++) {
        map[x] = []
        for (var y = 0; y < worldHeight; y++) {
            map[x][y] = 0
        }
    }

    for (var x = 0; x < worldWidth; x++) {
        for (var y = 0; y < worldHeight; y++) {
            //Here we use our chanceToStartAlive variable
            if (Math.random() < chanceToStartAlive)
            //We're using numbers, not booleans, to decide if something is solid here. 0 = not solid
                map[x][y] = 1
        }
    }

    return map
}

function doSimulationStep(map) {
    //Here's the new map we're going to copy our data into
    var newmap = [
        []
    ]
    for (var x = 0; x < map.length; x++) {
        newmap[x] = []
        for (var y = 0; y < map[0].length; y++) {
            //Count up the neighbours
            var nbs = countAliveNeighbours(map, x, y)
                //If the tile is currently solid
            if (map[x][y] === solid) {
                //See if it should die
                if (nbs < deathLimit) {
                    newmap[x][y] = empty
                }
                //Otherwise keep it solid
                else {
                    newmap[x][y] = solid
                }
            }
            //If the tile is currently empty
            else {
                //See if it should become solid
                if (nbs > birthLimit) {
                    newmap[x][y] = solid
                } else {
                    newmap[x][y] = empty
                }
            }
        }
    }

    return newmap
}

//This function counts the number of solid neighbours a tile has
function countAliveNeighbours(map, x, y) {
    var count = 0
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            var nb_x = i + x
            var nb_y = j + y
            if (i == 0 && j == 0) {}
            //If it's at the edges, consider it to be solid (you can try removing the count = count + 1)
            else if (nb_x < 0 || nb_y < 0 ||
                nb_x >= map.length ||
                nb_y >= map[0].length) {
                count = count + 1
            } else if (map[nb_x][nb_y] == 1) {
                count = count + 1
            }
        }
    }
    return count
}

function getCells() {
    var cellmap = generateMap()
    var flat = _.flatten(cellmap)

    return flat
}

getCells()

module.exports = getCells