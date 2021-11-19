import { DrawEvent, EventHandler, Game, isPointInRectangle, KeyboardEvent, MouseButtonEvent } from 'heks';
import type { GameEvents } from 'heks';
import { add, Vector2D } from 'dotspace';
import { pick } from 'roll-the-bones';
import palette from './palette';

interface State {
	mousePosition: [x: number, y: number];
	pencilColor: string;
	availablePencils: string[];
	drawing: { [position: string]: string };
}

interface Events extends GameEvents {}
type Handler<Event> = EventHandler<Event, Events, State>;

const gameSize: [width: number, height: number] = [128, 72];
const paperPosition: [x: number, y: number] = [(128 / 2) - (64 / 2), (72 / 2) - (64 / 2)];
const paperSize: [width: number, height: number] = [64, 64];

const chosenPencils = pick(palette, 5);

const initialState: State = {
	mousePosition: [0, 0],
	availablePencils: chosenPencils,
	pencilColor: chosenPencils[0],
	drawing: {},
};

const game = new Game<State, Events>(gameSize, {
	backgroundColor: '#000000',
	initialState,
});

game.eventEmitter.on('mouseMove', (state, { position }) => {
	return {
		...state,
		mousePosition: position,
	}
});

function isPencilOnPaper(pencilPosition: [x: number, y: number]): boolean {
	const paperRectangle = [paperPosition, add(paperPosition, paperSize) as Vector2D] as [Vector2D, Vector2D];

	return isPointInRectangle(pencilPosition, paperRectangle);
}

function getRandomColor(): string {
	return `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

const drawCurrentPencil: Handler<DrawEvent> = (state, { context }) => {
	context.fillStyle = state.pencilColor;
	context.fillRect(16, 32, 7, 16);

	return state;
}

const drawPencil: Handler<DrawEvent> = (state, { context }) => {
	if (!isPencilOnPaper(state.mousePosition)) {
		return state;
	}

	context.fillStyle = state.pencilColor;
	context.fillRect(state.mousePosition[0], state.mousePosition[1], 1, 1);

	return state;
}

const drawPaper: Handler<DrawEvent> = (state, { context }) => {
	context.fillStyle = '#ffffff';
	context.fillRect((128 / 2) - (64 / 2), (72 / 2) - (64 / 2), 64, 64);

	Object.entries(state.drawing).forEach(([positionString, color]) => {
		const [x, y] = positionString.split(',').map(component => parseInt(component, 10));
		context.fillStyle = color;
		context.fillRect(x, y, 1, 1);
	});

	return state;
}

const doSomeDrawing: Handler<MouseButtonEvent> = (state, { button, position }) => {
	if (!isPencilOnPaper(state.mousePosition)) {
		return state;
	}

	return {
		...state,
		drawing: {
			...state.drawing,
			[`${state.mousePosition[0]},${state.mousePosition[1]}`]: state.pencilColor,
		},
	};
}

const switchColors: Handler<KeyboardEvent> = (state, { key }) => {
	if (key !== 'p') {
		return state;
	}

	return {
		...state,
		pencilColor: getRandomColor(),
	};
}

game.eventEmitter.on('draw', drawCurrentPencil);
game.eventEmitter.on('draw', drawPaper);
game.eventEmitter.on('draw', drawPencil);
game.eventEmitter.on('mousePressed', doSomeDrawing);
game.eventEmitter.on('keyDown', switchColors);

game.start();
