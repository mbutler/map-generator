let _ = require('lodash')
let fs = require('fs')
let backgroundCells = require('./cellular')

let statue_head = [537, 538, 569, 570, 601, 602]

// _empty, _solid, startAliveChance, steps, birth, death, edgeTile
// default: 523, 938, 50, 3, 3, 4, 940
var cellList = backgroundCells(524, 937, 50, 3, 3, 3, 900)

var height = 100,
    width = 100,
    orientation = "orthogonal",
    renderorder = "right-down",
    tileheight = 32,
    tilewidth = 32,
    version = 1,
    map = {}

/**
 * Calculates the 1D index for an element at a given 2D coordinate 
 *
 * @param {integer} x - The X coordinate of the tile.
 * @param {integer} y - The Y coordinate of the tile.
 * @return {integer} - The index of the tile.
 */
function getIndexFromCoords(x, y) {
    //subtract 1 from x and y for zero-based arrays
    var index = (x - 1) + ((y - 1) * map.width)

    return index
}

/**
 * Walks through the map at specified spacing and randomly places tiles using placeTiles
 *
 * @param {string} tileName - The json name of the tileset.
 * @param {integer} spacing - The number of tiles to jump ahead on each iteration.
 * @param {integer} offset - The upper limit number of tiles to randomly shift the tileset around to give variance.
 * @param {integer} rate - The percent chance the tileset will be placed at the current iterations location. 1-100
 * @param {string} layer - The json layer name on which to place the tileset.
 */
function placeRandom(tileName, spacing, offset, rate, layer) {
    for (var k = 1; k < width; k += spacing) {
        for (var m = 0; m < height; m += spacing) {
            var rand = _.random(100)
            if (rand < rate) {
                var placeX = k + _.random(1, offset)
                var placeY = m + _.random(1, offset)
                placeTiles(tileName, placeX, placeY, layer)
            }
        }
    }
}

// the stacking order for various tilesets
let stacking = {
    "tree": [
        { "name": "Foreground", "range": _.range(73, 122) },
        { "name": "Middleground", "range": _.range(122, 137) },
        { "name": "Blocked", "range": [124, 125] }
    ]
}

/**
 * Places a selection from a larger sprite atlas on a specified map layer.
 * Mutates the map layers.
 *
 * @param {string} tiles - The name of the png sprite atlas as specified in the json.
 * @param {integer} x - The X coordinate of where the selection should be placed on the map (1-100).
 * @param {integer} y - The Y coordinate of where the selection should be placed on the map (1-100).
 * @param {array} tileList - An array of all of the tiles in the atlas selection.
 * @param {integer} columns - The number of columns in the atlas selection area.
 * @param {string} layer - The name of the layer to place the selection as specified in the json.
 * @param {boolean} blocked - Whether or not to also block the entire selection on the Blocked layer
 */
function placeTilesFromAtlas(tiles, x, y, tileList, columns, layer, blocked) {
    var tileset = _.find(map.tilesets, ['name', tiles])
    var startTile = getIndexFromCoords(x, y)
    var i, j
    var tileList = tileList
    var firstTile = _.head(tileList)
    var lastTile = _.last(tileList)
    var columns = columns
    var chunkList = _.chunk(tileList, columns)
    var mapLayer = _.find(map.layers, ['name', layer]) || {}
    var blockedLayer = _.find(map.layers, ['name', "Blocked"])

    _.forEach(chunkList, function(row) {
        for (i = 0; i < columns; i++) {
            let newY = y + _.indexOf(chunkList, row)
            let newX = x + i
            let index = getIndexFromCoords(newX, newY)
            var currentTile = row[i]

            mapLayer.data[index] = currentTile

            if (blocked) {
                blockedLayer.data[index] = 137
            }
        }
    })
}

/**
 * Gets the elements in a 1D array for a 2D map area selection. Top-left is the origin.
 *
 * @param {integer} startX - The X coordinate on the map where the selection should begin.
 * @param {integer} startY - The Y coordinate on the map where the selection should begin.
 * @param {integer} rows - The number of rows in the selection area.
 * @param {integer} columns - The number of columns in the selection area.
 * @param {string} layer - The name of the layer from which to select from. Specified in json file.
 * @return {array} - An array of all elements in the 1D layer.data
 */
function getAreaContents(startX, startY, rows, columns, layer) {
    var tileList = []
    var i, j, newX, newY, coordinate, contents
    var mapLayer = _.find(map.layers, ['name', layer])

    for (i = 0; i < columns; i++) {
        for (j = 0; j < rows; j++) {
            newX = startX + i
            newY = startY + j
            coordinate = getIndexFromCoords(newX, newY)
            contents = mapLayer.data[coordinate]
            tileList.push(contents)
        }
    }

    return tileList
}

/**
 * Checks to see if the specific 8x8 tree tileset exists at the map coordinates given. Top-left is the origin.
 * Used to potentially place another tree in this spot, so it check all 64 tiles for overlap. 
 *
 * @param {integer} x - The X coordinate of the top-left 8x8 selection.
 * @param {integer} y - The Y coordinate of the top-left 8x8 selection.
 * @return {boolean} - True for tree, False for no tree.
 */
function isTree(x, y) {
    var tree = false
    var fore = _.find(map.layers, ['name', "Foreground"])
    var mid = _.find(map.layers, ['name', "Middleground"])
    var foreList = getAreaContents(x, y, 8, 8, "Foreground")
    var midList = getAreaContents(x, y, 8, 8, "Middleground")
    var treeMidList = _.find(stacking.tree, ['name', 'Middleground'])
    var treeForeList = _.find(stacking.tree, ['name', "Foreground"])

    var foreIntersect = _.intersection(foreList, treeForeList.range)
    var midIntersect = _.intersection(midList, treeMidList.range)

    if (foreIntersect.length > 0 || midIntersect.length > 0) {
        tree = true
    }

    return tree
}

/**
 * Places an entire individual tileset on a particular layer at a 2D map coordinate
 * Layer parameter is optional. If missing, it looks for a stack order from the stacking object and uses that.
 * Mutates the map layers.
 *
 * @param {string} tiles - The tileset name as specified in the json file.
 * @param {integer} x - The X coordinate on the map where the tileset should be placed.
 * @param {integer} y - The Y coordinate on the map where the tileset should be placed.
 * @param {string} layer - The json name of the layer to place the tileset. Optional. Leave black if stacking is needed.
 */
function placeTiles(tiles, x, y, layer) {
    var tileset = _.find(map.tilesets, ['name', tiles])
    var startTile = getIndexFromCoords(x, y)
    var i, j
    var firstTile = tileset.firstgid
    var lastTile = firstTile + tileset.tilecount - 1
    var columns = tileset.columns
    var tileList = _.range(firstTile, lastTile + 1)
    var chunkList = _.chunk(tileList, columns) // break the tile range into chunks (rows)
    var mapLayer = _.find(map.layers, ['name', layer]) || {}
    var stack = stacking[tiles]

    // loops through each row and column, looking up map index values and replacing with tileset values
    _.forEach(chunkList, function(row) {
        for (i = 0; i < columns; i++) {
            let newY = y + _.indexOf(chunkList, row)
            let newX = x + i
            let index = getIndexFromCoords(newX, newY)
            var currentTile = row[i]

            if (stack) {
                _.forEach(stack, function(_layer) {
                    if (_.includes(_layer.range, currentTile)) {
                        mapLayer = _.find(map.layers, ['name', _layer.name])
                        if (_layer.name === "Blocked") {
                            currentTile = 137
                            mapLayer.data[index] = currentTile
                        } else {
                            mapLayer.data[index] = currentTile
                        }
                    }
                })
            } else {
                mapLayer.data[index] = currentTile
            }
        }
    })
}

/**
 * Walks through every tile on a map layer, randomly replacing the specified original with a replacement tile 
 *
 * @param {integer} original - The original tile gid that will be replaced randomly.
 * @param {integer} replacement - The tile gid that will replace the original randomly.
 * @param {integer} rate - The rate at which tiles will be replaced. 1-100. e.g. 50 means 50% chance of a replacement.
 * @param {string} layer - The json name of the layer that will be affected.
 * @param {boolean} blocked - Optional parameter that will also block that tile on the Blocked layer.
 */
function walkAndReplace(original, replacement, rate, layer, blocked) {
    let mapLayer = _.find(map.layers, ['name', layer])
    let blockedLayer = _.find(map.layers, ['name', "Blocked"])
    for (var p = 0; p < width * height; p++) {

        if (mapLayer.data[p] === original) {
            let rand = _.random(100)
            if (rand < rate) {
                mapLayer.data[p] = replacement

                if (blocked) {
                    blockedLayer.data[p] = 137
                }
            }
        }
    }
}

/**
 * Builds a 100x100 map layer. If "Background" is the parameter, it will use the cellList data instead.
 *
 * @param {string} layerName - The name of the map layer to create.
 * @return {object} - The layer object with all layer properties.
 */
function makeLayer(layerName) {
    var layer = {},
        i

    layer.name = layerName
    layer.data = []
    layer.height = height
    layer.width = width
    layer.opacity = 1
    layer.type = "tilelayer"
    layer.visible = true
    layer.x = 0
    layer.y = 0

    // use the returned cellList to populate the Background layer
    if (layerName === "Background") {
        for (i = 0; i < 10000; i++) {
            layer.data.push(cellList[i])
        }
    } else {
        for (i = 0; i < 10000; i++) {
            layer.data.push(0)
        }
    }

    return layer
}

/**
 * Places the 'tree' tileset on the map a number of times using the placeTiles function.
 *
 * @param {integer} total - The number of tries to place a tree. Serves as an upper limit. 
 */
function placeTrees(total) {
    var randX, randY, treeExists
    for (var z = 0; z < total; z++) {
        // keep this in bounds or the map will error. 8 tile margin
        randX = _.random(8, 92)
        randY = _.random(8, 92)
        treeExists = isTree(randX, randY)

        if (treeExists === false) {
            placeTiles("tree", randX, randY)
        }
    }
}

map = {
    "height": height,
    "width": width,
    "layers": [makeLayer("Background"), makeLayer("Middleground"), makeLayer("Foreground"), makeLayer("Blocked")],
    "nextobjectid": 1,
    "orientation": orientation,
    "properties": {},
    "renderorder": renderorder,
    "tileheight": tileheight,
    "tilewidth": tilewidth,
    "tilesets": [{
            "columns": 12,
            "firstgid": 1,
            "image": "grass-tiles.png",
            "imageheight": 192,
            "imagewidth": 384,
            "margin": 0,
            "name": "grass-tiles",
            "properties": {},
            "spacing": 0,
            "tilecount": 72,
            "tileheight": 32,
            "tilewidth": 32
        },
        {
            "columns": 8,
            "firstgid": 73,
            "image": "tree.png",
            "imageheight": 256,
            "imagewidth": 256,
            "margin": 0,
            "name": "tree",
            "properties": {},
            "spacing": 0,
            "tilecount": 64,
            "tileheight": 32,
            "tilewidth": 32
        },
        {
            "columns": 1,
            "firstgid": 137,
            "image": "blocked.png",
            "imageheight": 32,
            "imagewidth": 32,
            "margin": 0,
            "name": "blocked",
            "properties": {},
            "spacing": 0,
            "tilecount": 1,
            "tileheight": 32,
            "tilewidth": 32
        },
        {
            "columns": 32,
            "firstgid": 138,
            "image": "terrain_atlas.png",
            "imageheight": 1024,
            "imagewidth": 1024,
            "margin": 0,
            "name": "terrain_atlas",
            "properties": {},
            "spacing": 0,
            "tilecount": 1024,
            "tileheight": 32,
            "tilewidth": 32
        }
    ],
    "version": version
}




//placeRandom("tree", 20, 8, 79)
placeTrees(20)
walkAndReplace(938, 939, 25, "Background", false)
walkAndReplace(0, 1043, 1, "Middleground", false)
walkAndReplace(0, 935, 1, "Middleground", true)

//placeTilesFromAtlas('terrain_atlas', 16, 15, statue_head, 2, "Middleground", true)

//placeTiles("tree", 1, 1)


fs.writeFile('generated-map.json', JSON.stringify(map, null, 4), function(err) {
    if (err) return console.log(err)
    console.log('map has been generated')
})