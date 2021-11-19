function setupCanvas(containerSelector, size, hideSystemCursor = true) {
    /**
     * First, we mount the game in the container element.
     */
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
        throw new Error('Couldn\'t create context from canvas');
    }
    const gameContainer = document.documentElement.querySelector(containerSelector);
    if (!gameContainer) {
        throw new Error(`Couldn't find element with selector ${containerSelector} to mount canvas on.`);
    }
    gameContainer.appendChild(canvas);
    /**
     * We give the canvas the user defined pixel size through element attributes,
     * and make sure it fills it's container width through CSS.
     */
    canvas.setAttribute('width', (size[0]).toString());
    canvas.setAttribute('height', (size[1]).toString());
    canvas.style.width = '100%';
    /**
     * By default an inline element, the canvas can have some stray spacing.
     * We change its display value to block to prevent those.
     */
    canvas.style.display = 'block';
    /**
     * We make sure that rendering is crisp in different browsers.
     */
    canvas.style.imageRendering = '-moz-crisp-edges';
    canvas.style.imageRendering = '-webkit-crisp-edges';
    canvas.style.imageRendering = 'pixelated';
    /**
     * Process option to show or hide system cursor
     */
    if (!hideSystemCursor) {
        canvas.style.cursor = 'none';
    }
    return {
        context,
        canvas,
    };
}
function clearCanvas(canvas, context, backgroundColor = '#000000') {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
}

function arrayWithout(array, ...valuesToExclude) {
    return array.filter((value) => {
        return !valuesToExclude.includes(value);
    });
}

function objectWithout(object, ...keysToRemove) {
    const entries = Object.entries(object);
    return entries.reduce((newObject, [currentKey, currentValue]) => {
        if (keysToRemove.includes(currentKey)) {
            return newObject;
        }
        return Object.assign(Object.assign({}, newObject), { [currentKey]: currentValue });
    }, {});
}

class EventEmitter {
    constructor() {
        this.eventHandlers = {};
        this.on = this.on.bind(this);
        this.emit = this.emit.bind(this);
        this.removeEventHandler = this.removeEventHandler.bind(this);
        this.removeAllEventHandlers = this.removeAllEventHandlers.bind(this);
    }
    on(eventType, handler) {
        this.eventHandlers = Object.assign(Object.assign({}, this.eventHandlers), { [eventType]: [
                ...this.eventHandlers[eventType] || [],
                handler,
            ] });
    }
    emit(eventType, currentState, event) {
        if (!this.eventHandlers.hasOwnProperty(eventType)) {
            return currentState;
        }
        const handlers = this.eventHandlers[eventType];
        return handlers.reduce((newState, currentHandler) => {
            return currentHandler(newState, event, {
                on: this.on,
                emit: this.emit,
                removeEventHandler: this.removeEventHandler,
                removeAllEventHandlers: this.removeAllEventHandlers,
            });
        }, currentState);
    }
    removeEventHandler(eventType, handler) {
        this.eventHandlers = Object.assign(Object.assign({}, this.eventHandlers), { [eventType]: arrayWithout(this.eventHandlers[eventType], handler) });
    }
    removeAllEventHandlers(eventType) {
        this.eventHandlers = objectWithout(this.eventHandlers, eventType);
    }
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

class Loop {
    constructor(update) {
        this.isRunning = false;
        this.time = 0;
        this.previousTime = 0;
        this.update = update;
    }
    get fps() {
        if (this.time === this.previousTime) {
            return 0;
        }
        return 1 / ((this.time - this.previousTime) / 1000);
    }
    start() {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;
        this.scheduleNextTick();
    }
    stop() {
        if (this.rafHandle) {
            window.cancelAnimationFrame(this.rafHandle);
        }
        this.isRunning = false;
    }
    tick() {
        return new Promise(resolve => {
            this.rafHandle = window.requestAnimationFrame((time) => {
                this.previousTime = this.time;
                this.time = time;
                this.update(time);
                resolve();
            });
        });
    }
    scheduleNextTick() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning) {
                return;
            }
            yield this.tick();
            this.scheduleNextTick();
        });
    }
}

function setupUpdateAndDrawEvents(eventEmitter, canvas, context) {
    eventEmitter.on('tick', (state, { time }, { emit }) => {
        state = emit('beforeUpdate', state, { time });
        state = emit('update', state, { time });
        state = emit('afterUpdate', state, { time });
        state = emit('beforeDraw', state, { time, context, canvas });
        state = emit('draw', state, { time, context, canvas });
        state = emit('afterDraw', state, { time, context, canvas });
        return state;
    });
}

let keysPressed = [];
let keysDown = [];
let keysUp = [];
function setupKeyboardEvents(eventEmitter) {
    window.addEventListener('keydown', (event) => {
        const key = event.key;
        if (!isKeyPressed(key) && !isKeyDown(key)) {
            keysPressed = [...keysPressed, key];
        }
        if (!isKeyDown(key)) {
            keysDown = [...keysDown, key];
        }
    });
    window.addEventListener('keyup', (event) => {
        const key = event.key;
        if (isKeyDown(key)) {
            keysDown = arrayWithout(keysDown, key);
        }
        if (!isKeyUp(key)) {
            keysUp = [...keysUp, key];
        }
    });
    window.addEventListener('blur', resetAllKeys);
    eventEmitter.on('update', (state, updateEvent, { emit }) => {
        keysPressed.forEach((keyPressed) => {
            state = emit('keyPressed', state, { key: keyPressed });
        });
        keysDown.forEach((keyDown) => {
            state = emit('keyDown', state, { key: keyDown });
        });
        keysUp.forEach((keyUp) => {
            state = emit('keyUp', state, { key: keyUp });
        });
        return state;
    });
    eventEmitter.on('afterUpdate', (state) => {
        resetKeysPressed();
        resetKeysUp();
        return state;
    });
}
function isKeyPressed(key) {
    return keysPressed.includes(key);
}
function isKeyDown(key) {
    return keysDown.includes(key);
}
function isKeyUp(key) {
    return keysUp.includes(key);
}
function resetKeysPressed() {
    keysPressed = [];
}
function resetKeysDown() {
    keysDown = [];
}
function resetKeysUp() {
    keysUp = [];
}
function resetAllKeys() {
    resetKeysPressed();
    resetKeysDown();
    resetKeysUp();
}

const mouseButtonMap = {
    0: 'left',
    1: 'middle',
    2: 'right',
    3: 'back',
    4: 'forward',
};
let mouseButtonsDown = [];
let mouseButtonsPressed = [];
let mouseButtonsUp = [];
let mousePosition = [0, 0];
let previousMousePosition = mousePosition;
function setupMouseEvents(eventEmitter, canvas) {
    window.addEventListener('mousedown', (event) => {
        if (!mouseButtonMap.hasOwnProperty(event.button)) {
            return;
        }
        const mouseButton = mouseButtonMap[event.button];
        if (!isMouseButtonDown(mouseButton) && !isMouseButtonPressed(mouseButton)) {
            mouseButtonsDown = [...mouseButtonsDown, mouseButton];
        }
        if (!isMouseButtonPressed(mouseButton)) {
            mouseButtonsPressed = [...mouseButtonsPressed, mouseButton];
        }
    });
    window.addEventListener('mouseup', (event) => {
        if (!mouseButtonMap.hasOwnProperty(event.button)) {
            return;
        }
        const mouseButton = mouseButtonMap[event.button];
        if (isMouseButtonPressed(mouseButton)) {
            mouseButtonsPressed = arrayWithout(mouseButtonsPressed, mouseButton);
        }
        if (!isMouseButtonUp(mouseButton)) {
            mouseButtonsUp = [...mouseButtonsUp, mouseButton];
        }
    });
    window.addEventListener('blur', resetAllMouseButtons);
    window.addEventListener('mousemove', (event) => {
        const canvasBoundaries = canvas.getBoundingClientRect();
        const horizontalScale = canvasBoundaries.width / canvas.width;
        const verticalScale = canvasBoundaries.height / canvas.height;
        const positionInScale = [
            (event.clientX - canvasBoundaries.left) / horizontalScale,
            (event.clientY - canvasBoundaries.top) / verticalScale,
        ];
        const x = Math.round(Math.min(Math.max(positionInScale[0], 0), canvas.width));
        const y = Math.round(Math.min(Math.max(positionInScale[1], 0), canvas.height));
        mousePosition = [x, y];
    });
    eventEmitter.on('update', (state, updateEvent, { emit }) => {
        if (mousePosition[0] !== previousMousePosition[0] || mousePosition[1] !== previousMousePosition[1]) {
            state = emit('mouseMove', state, { position: mousePosition });
        }
        mouseButtonsDown.forEach((button) => {
            state = emit('mouseDown', state, { button, position: mousePosition });
        });
        mouseButtonsPressed.forEach((button) => {
            state = emit('mousePressed', state, { button, position: mousePosition });
        });
        mouseButtonsUp.forEach((button) => {
            state = emit('mouseUp', state, { button, position: mousePosition });
        });
        return state;
    });
    eventEmitter.on('afterUpdate', (state) => {
        previousMousePosition = mousePosition;
        resetMouseButtonsDown();
        resetMouseButtonsUp();
        return state;
    });
}
function isMouseButtonPressed(mouseButton) {
    return mouseButtonsPressed.includes(mouseButton);
}
function isMouseButtonDown(mouseButton) {
    return mouseButtonsDown.includes(mouseButton);
}
function isMouseButtonUp(mouseButton) {
    return mouseButtonsUp.includes(mouseButton);
}
function resetMouseButtonsPressed() {
    mouseButtonsPressed = [];
}
function resetMouseButtonsDown() {
    mouseButtonsDown = [];
}
function resetMouseButtonsUp() {
    mouseButtonsUp = [];
}
function resetAllMouseButtons() {
    resetMouseButtonsPressed();
    resetMouseButtonsDown();
    resetMouseButtonsUp();
}

class Game {
    constructor(size, { backgroundColor, containerSelector = 'body', initialState = {}, showSystemCursor, } = {}) {
        const { canvas, context } = setupCanvas(containerSelector, size, showSystemCursor);
        this.canvas = canvas;
        this.context = context;
        this.state = Object.assign({}, initialState);
        this.eventEmitter = new EventEmitter();
        this.loop = new Loop(this.loopCallback.bind(this));
        setupUpdateAndDrawEvents(this.eventEmitter, this.canvas, this.context);
        setupKeyboardEvents(this.eventEmitter);
        setupMouseEvents(this.eventEmitter, this.canvas);
        this.eventEmitter.on('beforeDraw', (state, { canvas, context }) => {
            clearCanvas(canvas, context, backgroundColor);
            return state;
        });
    }
    start() {
        this.state = this.eventEmitter.emit('start', this.state, {});
        this.loop.start();
    }
    loopCallback(time) {
        this.state = this.eventEmitter.emit('tick', this.state, { time });
    }
}
/*
 * Figuring out rectangles in my head gives me a head ache, so it's comment time.
 * When given rectangle r = [[left, top], [right, bottom]], this is how you find each corner:
 *
 * top 		=> r[0][1]
 * right 	=> r[1][0]
 * bottom 	=> r[1][1]
 * left 	=> r[0][0]
 */
function isPointInRectangle(point, rectangle) {
    return point[0] >= rectangle[0][0]
        && point[1] >= rectangle[0][1]
        && point[0] <= rectangle[1][0]
        && point[1] <= rectangle[1][1];
}

function add(...vectors) {
    if (vectors.length === 0) {
        throw new Error('Can\'t add 0 vectors.');
    }
    return vectors.reduce((totalVector, currentVector) => {
        if (!totalVector) {
            return currentVector;
        }
        if (currentVector.length !== totalVector.length) {
            throw new Error(`Can't add vectors with differing lengths. Expected a length of ${totalVector.length}, but got a length of ${currentVector.length}.`);
        }
        return totalVector.map((component, index) => {
            return component + currentVector[index];
        });
    });
}

const gameSize = [128, 72];
const paperPosition = [(128 / 2) - (64 / 2), (72 / 2) - (64 / 2)];
const paperSize = [64, 64];
const initialState = {
    mousePosition: [0, 0],
    pencilColor: 'red',
    drawing: {},
};
const game = new Game(gameSize, {
    backgroundColor: '#000000',
    initialState,
});
game.eventEmitter.on('mouseMove', (state, { position }) => {
    return Object.assign(Object.assign({}, state), { mousePosition: position });
});
function isPencilOnPaper(pencilPosition) {
    const paperRectangle = [paperPosition, add(paperPosition, paperSize)];
    return isPointInRectangle(pencilPosition, paperRectangle);
}
function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}
const drawCurrentPencil = (state, { context }) => {
    context.fillStyle = state.pencilColor;
    context.fillRect(16, 32, 7, 16);
    return state;
};
const drawPencil = (state, { context }) => {
    if (!isPencilOnPaper(state.mousePosition)) {
        return state;
    }
    context.fillStyle = state.pencilColor;
    context.fillRect(state.mousePosition[0], state.mousePosition[1], 1, 1);
    return state;
};
const drawPaper = (state, { context }) => {
    context.fillStyle = '#ffffff';
    context.fillRect((128 / 2) - (64 / 2), (72 / 2) - (64 / 2), 64, 64);
    Object.entries(state.drawing).forEach(([positionString, color]) => {
        const [x, y] = positionString.split(',').map(component => parseInt(component, 10));
        context.fillStyle = color;
        context.fillRect(x, y, 1, 1);
    });
    return state;
};
const doSomeDrawing = (state, { button, position }) => {
    if (!isPencilOnPaper(state.mousePosition)) {
        return state;
    }
    return Object.assign(Object.assign({}, state), { drawing: Object.assign(Object.assign({}, state.drawing), { [`${state.mousePosition[0]},${state.mousePosition[1]}`]: state.pencilColor }) });
};
const switchColors = (state, { key }) => {
    if (key !== 'p') {
        return state;
    }
    return Object.assign(Object.assign({}, state), { pencilColor: getRandomColor() });
};
game.eventEmitter.on('draw', drawCurrentPencil);
game.eventEmitter.on('draw', drawPaper);
game.eventEmitter.on('draw', drawPencil);
game.eventEmitter.on('mousePressed', doSomeDrawing);
game.eventEmitter.on('keyDown', switchColors);
game.start();
