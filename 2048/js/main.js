class KeyboardInputManager {

    constructor() {
        this.events = {};

        if (window.navigator.msPointerEnabled) {
            //IE 10 style
            this.eventTouchstart = "MSPointerDown";
            this.eventTouchmove = "MSPointerMove";
            this.eventTouchend = "MSPointerUp";
        } else {
            this.eventTouchstart = "touchstart";
            this.eventTouchmove = "touchmove";
            this.eventTouchend = "touchend";
        }

        this.listen();
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        let callbacks = this.events[event];
        if (callbacks) {
            callbacks.forEach(callback => {
                callback(data);
            });
        }
    }

    listen() {
        const that = this;

        const map = {
            38: 0, // Up
            39: 1, // Right
            40: 2, // Down
            37: 3, // Left
            75: 0, // Vim up
            76: 1, // Vim right
            74: 2, // Vim down
            72: 3, // Vim left
            87: 0, // W
            68: 1, // D
            83: 2, // S
            65: 3  // A
        };

        // Respond to direction keys
        document.addEventListener("keydown", function (event) {
            console.log(event);
            
            let modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                event.shiftKey;
            let mapped = map[event.which];

            if (!modifiers) {
                if (mapped !== undefined) {
                    event.preventDefault();
                    that.emit("move", mapped);
                }
            }

            // R key restarts the game
            if (!modifiers && event.which === 82) {
                that.restart.call(that, event);
            }
        });

        // Respond to button presses
        this.bindButtonPress(".retry-button", this.restart);
        this.bindButtonPress(".restart-button", this.restart);
        this.bindButtonPress(".keep-playing-button", this.keepPlaying);

        // Respond to swipe events
        let touchStartClientX, touchStartClientY;
        let gameContainer = document.querySelector(".game-container");

        gameContainer.addEventListener(this.eventTouchstart, function (event) {
            if ((!window.navigator.msPointerEnabled && event.touches.length > 1) ||
                event.targetTouches > 1) {
                return; // Ignore if touching with more than 1 finger
            }

            if (window.navigator.msPointerEnabled) {
                touchStartClientX = event.pageX;
                touchStartClientY = event.pageY;
            } else {
                touchStartClientX = event.touches[0].clientX;
                touchStartClientY = event.touches[0].clientY;
            }

            event.preventDefault();
        });

        gameContainer.addEventListener(this.eventTouchmove, function (event) {
            event.preventDefault();
        });

        gameContainer.addEventListener(this.eventTouchend, function (event) {
            if ((!window.navigator.msPointerEnabled && event.touches.length > 0) ||
                event.targetTouches > 0) {
                return; // Ignore if still touching with one or more fingers
            }

            let touchEndClientX, touchEndClientY;

            if (window.navigator.msPointerEnabled) {
                touchEndClientX = event.pageX;
                touchEndClientY = event.pageY;
            } else {
                touchEndClientX = event.changedTouches[0].clientX;
                touchEndClientY = event.changedTouches[0].clientY;
            }

            const dx = touchEndClientX - touchStartClientX;
            const absDx = Math.abs(dx);

            const dy = touchEndClientY - touchStartClientY;
            const absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > 10) {
                // (right : left) : (down : up)
                that.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
            }
        });
    }

    restart(event) {
        console.log(event);
        event.preventDefault();
        this.emit('restart');
    }

    keepPlaying(event) {
        event.preventDefault();
        this.emit('keepPlaying');
    }

    bindButtonPress(selector, fn) {
        console.log(selector);
        const button = document.querySelector(selector);
        if(!button) return;
        button.addEventListener('click', fn.bind(this));
        button.addEventListener(this.eventTouchend, fn.bind(this));
    }

}

class HTMLActuator {

    constructor() {
        this.score = 0;
        this.tileContainer = document.querySelector('.tile-container');
        this.scoreContainer = document.querySelector('.score-current');
        this.bsetContainer = document.querySelector('.score-best');
        this.msgContainer = document.querySelector('.game-message');
    }

    actuate(grid, metadata) {
        const that = this;
        window.requestAnimationFrame(function () {
            that.clearContainer(that.tileContainer);
            grid.cells.forEach(column => {
                column.forEach(cell => {
                    if (cell) {
                        that.addTile(cell);
                    }
                });
            });

            that.updateScore(metadata.score);
            that.updateBestScore(metadata.bestScore);

            if (metadata.terminated) {
                if (metadata.over) {
                    that.msg(false); // lose the game;
                } else {
                    that.msg(true); // you are the winner!;
                }
            }
        });
    }

    continueGame() {
        this.clearMsg();
    }

    clearContainer(container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild)
        }
    }

    addTile(tile) {
        const that = this;
        const wrapper = document.createElement('div');
        const inner = document.createElement('div');
        const pos = tile.previousPosition || { x: tile.x, y: tile.y };
        const posClass = this.positionClass(pos);

        const classes = ['tile', 'tile-' + tile.value, posClass];

        if (tile.value > 2048) {
            classes.push('tile-super');
        }
        this.applyClasses(wrapper, classes);

        inner.classList.add('tile-inner');
        inner.textContent = tile.value;

        if (tile.previousPosition) {
            window.requestAnimationFrame(function () {
                classes[2] = that.positionClass({
                    x: tile.x,
                    y: tile.y
                });
                that.applyClasses(wrapper, classes);
            })
        } else if (tile.mergedFrom) {
            classes.push('tile-merged');
            this.applyClasses(wrapper, classes);

            // 渲染合并的tiles
            tile.mergedFrom.forEach(merged => {
                that.addTile(merged);
            });
        } else {
            classes.push('tile-new');
            this.applyClasses(wrapper, classes);
        }
        wrapper.appendChild(inner);
        this.tileContainer.appendChild(wrapper);
    }

    applyClasses(ele, classes) {
        ele.setAttribute('class', classes.join(" "));
    }

    normalizePosition(pos) {
        return {
            x: pos.x + 1,
            y: pos.y + 1
        }
    }

    positionClass(position) {
        const pos = this.normalizePosition(position);
        return `tile-position-${pos.x}-${pos.y}`;
    }

    updateScore(score) {
        this.clearContainer(this.scoreContainer);
        const difference = score - this.score;
        this.score = score;
        this.scoreContainer.textContent = score;
        if (difference) {
            const addition = `<div class="score-addition">+${difference}</div>`;
            this.scoreContainer.insertAdjacentHTML('beforeend', addition);
        }
    }

    updateBestScore(score) {
        this.bsetContainer.textContent = score;
    }

    msg(won) {
        const type = won ? 'game-won' : 'game-over';
        const msg = won ? 'You win!' : 'Game over!';
        this.msgContainer.classList.add(type);
        this.msgContainer.querySelector('p')[0].textContent = msg;
    }

    clearMsg() {
        // IE only takes one value to remove at a time.
        this.msgContainer.classList.remove("game-won");
        this.msgContainer.classList.remove("game-over");
    }
}

class Grid {
    constructor(size, previousState) {
        this.size = size;
        this.cells = previousState ? this.fromState(previousState) : this.empty();
        console.log(this.cells);

    }

    empty() {
        let cells = [];

        for (let x = 0; x < this.size; x++) {
            let row = cells[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(null);
            }
        }

        return cells;
    }

    fromState(state) {
        let cells = [];
        for (let x = 0; x < this.size; x++) {
            let row = cells[x] = [];

            for (let y = 0; y < this.size; y++) {
                const tile = state[x][y];
                row.push(tile ? new Tile(tile.pos, tile.value) : null);
            }
        }

        return cells;
    }

    // 查找第一次随机的位置
    randomAvailableCell() {
        let cells = this.availableCells();
        if (cells.length) {
            return cells[Math.floor(Math.random() * cells.length)];
        }
    }

    availableCells() {
        let cells = [];

        this.eachCell(function (x, y, tile) {
            if (!tile) {
                cells.push({
                    x,
                    y
                });
            }
        });
        return cells;
    }

    eachCell(callback) {
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                callback(x, y, this.cells[x][y]);
            }
        }
    }

    cellsAvailable() {
        return !!this.availableCells().length;
    }

    cellAvailable(cell) {
        return !this.cellOccupied(cell);
    }

    cellOccupied(cell) {
        return !!this.cellContent(cell);
    }

    cellContent(cell) {
        if (this.withinBounds(cell)) {
            return this.cell[cell.x][cell.y];
        } else {
            return null;
        }
    }

    insertTile(tile) {
        console.log(tile);
        this.cells[tile.x][tile.y] = tile;
    }

    removeTile(tile) {
        this.cells[tile.x][tile.y] = null;
    }

    withinBounds(pos) {
        return pos.x >= 0 && pos.x < this.size && pos.y >= 0 && pos.y < this.size;
    }

    serialize() {
        let cellState = [];

        for (let x = 0; x < this.size; x++) {
            let row = cellState[x] = [];
            for (let y = 0; y < this.size; y++) {
                row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
            }
        }
        return {
            size: this.size,
            cells: cellState
        }
    }
}

class Tile {
    constructor(pos, value = 2) {
        this.x = pos.x;
        this.y = pos.y;
        this.value = value;
        this.previousPosition = null;
        this.mergedFrom = null;
    }

    savePosition() {
        this.previousPosition = { x: this.x, y: this.y };
    }

    updatePosition(pos) {
        this.x = pos.x;
        this.y = pos.y;
    }

    serialize() {
        return {
            pos: {
                x: this.x,
                x: this.y
            },
            value: this.value
        }
    }
}

class LocalStorageManager {
    constructor() {
        this.bsetScoreKey = "bestScore";
        this.gameStateKey = "gameState";
    }

    getBestScore() {
        return localStorage.getItem(this.bsetScoreKey) || 0;
    }

    setBestScore(score) {
        return localStorage.setItem(this.bsetScoreKey, score);
    }

    getGameState() {
        const stateJSON = localStorage.getItem(this.gameStateKey);
        return stateJSON ? JSON.parse(stateJSON) : null;
    }

    setGameState(gameState) {
        localStorage.setItem(this.gameStateKey, JSON.stringify(gameState));
    }

    clearGameState() {
        localStorage.removeItem(this.gameStateKey);
    }
}

class GameManager {

    constructor(size, InputManager, Actuator, StorageManager) {
        this.size = size; // Size of the grid
        this.inputManager = new InputManager;
        this.storageManager = new StorageManager;
        this.actuator = new Actuator;

        this.startTiles = 2;

        this.inputManager.on("move", this.move.bind(this));
        this.inputManager.on("restart", this.restart.bind(this));
        this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

        this.setup();
    }

    restart() {
        this.storageManager.clearGameState();
        this.actuator.continueGame(); // Clear the game won/lost message
        this.setup();
    }

    keepPlaying() {
        this.keepPlaying = true;
        this.actuator.continueGame(); // Clear the game won/lost message
    };
    isGameTerminated() {
        return this.over || (this.won && !this.keepPlaying);
    };

    setup() {
        var previousState = this.storageManager.getGameState();
        console.log(previousState);

        // Reload the game from a previous game if present
        if (previousState) {
            this.grid = new Grid(previousState.grid.size, previousState.grid.cells); // Reload grid
            this.score = previousState.score;
            this.over = previousState.over;
            this.won = previousState.won;
            this.keepPlaying = previousState.keepPlaying;
        } else {
            this.grid = new Grid(this.size);
            this.score = 0;
            this.over = false;
            this.won = false;
            this.keepPlaying = false;

            // Add the initial tiles
            this.addStartTiles();
        }

        // Update the actuator
        this.actuate();
    };

    addStartTiles() {
        for (var i = 0; i < this.startTiles; i++) {
            this.addRandomTile();
        }
    };

    addRandomTile() {
        console.log(this.grid.cellsAvailable());

        if (this.grid.cellsAvailable()) {
            var value = Math.random() < 0.9 ? 2 : 4;
            console.log(value);
            var tile = new Tile(this.grid.randomAvailableCell(), value);

            this.grid.insertTile(tile);
        }
    };

    actuate() {
        if (this.storageManager.getBestScore() < this.score) {
            this.storageManager.setBestScore(this.score);
        }

        // Clear the state when the game is over (game over only, not win)
        if (this.over) {
            this.storageManager.clearGameState();
        } else {
            this.storageManager.setGameState(this.serialize());
        }

        this.actuator.actuate(this.grid, {
            score: this.score,
            over: this.over,
            won: this.won,
            bestScore: this.storageManager.getBestScore(),
            terminated: this.isGameTerminated()
        });

    };

    serialize() {
        return {
            grid: this.grid.serialize(),
            score: this.score,
            over: this.over,
            won: this.won,
            keepPlaying: this.keepPlaying
        };
    };

    prepareTiles() {
        this.grid.eachCell(function (x, y, tile) {
            if (tile) {
                tile.mergedFrom = null;
                tile.savePosition();
            }
        });
    };

    moveTile(tile, cell) {
        this.grid.cells[tile.x][tile.y] = null;
        this.grid.cells[cell.x][cell.y] = tile;
        tile.updatePosition(cell);
    };

    move(direction) {
        // 0: up, 1: right, 2: down, 3: left
        var self = this;

        if (this.isGameTerminated()) return; // Don't do anything if the game's over

        var cell, tile;

        var vector = this.getVector(direction);
        var traversals = this.buildTraversals(vector);
        var moved = false;

        // Save the current tile positions and remove merger information
        this.prepareTiles();

        // Traverse the grid in the right direction and move tiles
        traversals.x.forEach(function (x) {
            traversals.y.forEach(function (y) {
                cell = { x: x, y: y };
                tile = self.grid.cellContent(cell);

                if (tile) {
                    var positions = self.findFarthestPosition(cell, vector);
                    var next = self.grid.cellContent(positions.next);

                    // Only one merger per row traversal?
                    if (next && next.value === tile.value && !next.mergedFrom) {
                        var merged = new Tile(positions.next, tile.value * 2);
                        merged.mergedFrom = [tile, next];

                        self.grid.insertTile(merged);
                        self.grid.removeTile(tile);

                        // Converge the two tiles' positions
                        tile.updatePosition(positions.next);

                        // Update the score
                        self.score += merged.value;

                        // The mighty 2048 tile
                        if (merged.value === 2048) self.won = true;
                    } else {
                        self.moveTile(tile, positions.farthest);
                    }

                    if (!self.positionsEqual(cell, tile)) {
                        moved = true; // The tile moved from its original cell!
                    }
                }
            });
        });

        if (moved) {
            this.addRandomTile();

            if (!this.movesAvailable()) {
                this.over = true; // ������!
            }

            this.actuate();
        }
    };

    getVector(direction) {
        // Vectors representing tile movement
        var map = {
            0: { x: 0, y: -1 }, // Up
            1: { x: 1, y: 0 },  // Right
            2: { x: 0, y: 1 },  // Down
            3: { x: -1, y: 0 }   // Left
        };

        return map[direction];
    };

    buildTraversals(vector) {
        let traversals = { x: [], y: [] };

        for (let pos = 0; pos < this.size; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }

        // Always traverse from the farthest cell in the chosen direction
        if (vector.x === 1) traversals.x = traversals.x.reverse();
        if (vector.y === 1) traversals.y = traversals.y.reverse();

        return traversals;
    };

    findFarthestPosition(cell, vector) {
        var previous;

        // Progress towards the vector direction until an obstacle is found
        do {
            previous = cell;
            cell = { x: previous.x + vector.x, y: previous.y + vector.y };
        } while (this.grid.withinBounds(cell) &&
            this.grid.cellAvailable(cell));

        return {
            farthest: previous,
            next: cell // Used to check if a merge is required
        };
    };

    movesAvailable() {
        return this.grid.cellsAvailable() || this.tileMatchesAvailable();
    };

    tileMatchesAvailable() {
        var self = this;

        var tile;

        for (var x = 0; x < this.size; x++) {
            for (var y = 0; y < this.size; y++) {
                tile = this.grid.cellContent({ x: x, y: y });

                if (tile) {
                    for (var direction = 0; direction < 4; direction++) {
                        var vector = self.getVector(direction);
                        var cell = { x: x + vector.x, y: y + vector.y };

                        var other = self.grid.cellContent(cell);

                        if (other && other.value === tile.value) {
                            return true; // These two tiles can be merged
                        }
                    }
                }
            }
        }

        return false;
    };

    positionsEqual(first, second) {
        return first.x === second.x && first.y === second.y;
    };
}

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
    new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager);
});