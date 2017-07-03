let _ = require('lodash')

var chanceToStartAlive = 50
var worldWidth = 100
var worldHeight = 100
var empty = 523 //tile index for dirt
var solid = 938 //tile index for grass
var numberOfSteps = 3
var birthLimit = 3
var deathLimit = 4

function generateMap() {
    var map = [
        []
    ]
    initialiseMap(map)

    for (var i = 0; i < numberOfSteps; i++) {
        map = doSimulationStep(map)
    }

    map = placeUnique(map, 2, 940)

    return map
}

function initialiseMap(map) {
    for (var x = 0; x < worldWidth; x++) {
        map[x] = []
        for (var y = 0; y < worldHeight; y++) {
            map[x][y] = empty
        }
    }

    for (var x = 0; x < worldWidth; x++) {
        for (var y = 0; y < worldHeight; y++) {
            if (_.random(100) < chanceToStartAlive)
            //We're using numbers, not booleans, to decide if something is solid here. 0 = not solid
                map[x][y] = solid
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
            if (i === 0 && j === 0) {}
            //If it's at the edges, consider it to be solid (you can try removing the count = count + 1)
            else if (nb_x < 0 || nb_y < 0 ||
                nb_x >= map.length ||
                nb_y >= map[0].length) {
                count = count + 1
            } else if (map[nb_x][nb_y] === solid) {
                count = count + 1
            }
        }
    }
    return count
}

//limit of 5 is a lot
function placeUnique(world, limit, tileIndex) {
    var hiddenLimit = limit;
    for (var x = 0; x < worldWidth; x++) {
        for (var y = 0; y < worldHeight; y++) {
            if (world[x][y] == empty) {
                var nbs = countAliveNeighbours(world, x, y)
                if (nbs >= hiddenLimit) {
                    world[x][y] = tileIndex
                }
            }
        }
    }
    return world
}

function getCells() {
    var cellmap = generateMap()
    var flat = _.flatten(cellmap)

    return flat
}

getCells()

module.exports = getCells