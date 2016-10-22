interface SupportedLanguages {
    en: string, ch: string,
};

interface Translations {
    [index: string]: SupportedLanguages;
}

module game {

  export let currentUpdateUI: IUpdateUI = null;
  export let didMakeMove: boolean = false; // You can only make one move per updateUI
  export let animationEndedTimeout: ng.IPromise<any> = null;
  export let state: IState = null;
  export let moveStart = -1;

  export function init() {
    registerServiceWorker();
    translate.setTranslations(getTranslations());
    translate.setLanguage('en');
    resizeGameAreaService.setWidthToHeight(1);
    moveService.setGame({
      minNumberOfPlayers: 2,
      maxNumberOfPlayers: 2,
      checkMoveOk: gameLogic.checkMoveOk,
      updateUI: updateUI,
      gotMessageFromPlatform: null,
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      let n: any = navigator;
      log.log('Calling serviceWorker.register');
      n.serviceWorker.register('service-worker.js').then(function(registration: any) {
        log.log('ServiceWorker registration successful with scope: ',    registration.scope);
      }).catch(function(err: any) {
        log.log('ServiceWorker registration failed: ', err);
      });
    }
  }

  function getTranslations(): Translations {
    return {};
  }

  export function updateUI(params: IUpdateUI): void {
    log.info("Game got updateUI:", params);
    didMakeMove = false; // Only one move per updateUI
    currentUpdateUI = params;
    clearAnimationTimeout();
    state = params.move.stateAfterMove;
    if (isFirstMove()) {
      state = gameLogic.getInitialState();
      if (isMyTurn()) makeMove(gameLogic.createInitialMove());
    } else {
      // We calculate the AI move only after the animation finishes,
      // because if we call aiService now
      // then the animation will be paused until the javascript finishes.
      animationEndedTimeout = $timeout(animationEndedCallback, 500);
    }
  }

  function animationEndedCallback() {
    log.info("Animation ended");
    maybeSendComputerMove();
  }

  function clearAnimationTimeout() {
    if (animationEndedTimeout) {
      $timeout.cancel(animationEndedTimeout);
      animationEndedTimeout = null;
    }
  }

  function maybeSendComputerMove() {
    if (!isComputerTurn()) return;
    let move = aiService.findComputerMove(currentUpdateUI.move);
    log.info("Computer move: ", move);
    makeMove(move);
  }

  function makeMove(move: IMove) {
    if (didMakeMove) { // Only one move per updateUI
      return;
    }
    didMakeMove = true;
    moveService.makeMove(move);
  }

  function isFirstMove() {
    return !currentUpdateUI.move.stateAfterMove;
  }

  function yourPlayerIndex() {
    return currentUpdateUI.yourPlayerIndex;
  }

  function isComputer() {
    return currentUpdateUI.playersInfo[currentUpdateUI.yourPlayerIndex].playerId === '';
  }

  function isComputerTurn() {
    return isMyTurn() && isComputer();
  }

  function isHumanTurn() {
    return isMyTurn() && !isComputer();
  }

  function isMyTurn() {
    return currentUpdateUI.move.turnIndexAfterMove >= 0 && // game is ongoing
      currentUpdateUI.yourPlayerIndex === currentUpdateUI.move.turnIndexAfterMove; // it's my turn
  }

  export function towerClicked(target: number): void {
    log.info("Clicked on tower:", target);
    if (!isHumanTurn()) return;
    if (window.location.search === '?throwException') { // to test encoding a stack trace with sourcemap
      throw new Error("Throwing the error because URL has '?throwException'");
    }
    if (moveStart !== -1) {
      let nextMove: IMove = null;
      try {
        nextMove = gameLogic.createMove(
          state, moveStart, target, currentUpdateUI.move.turnIndexAfterMove);
      } catch (e) {
        log.info(["Unable to create a move between:", moveStart, target]);
        return;
      }
      // Move is legal, make it!
      makeMove(nextMove);
      moveStart = -1;
    } else {
      moveStart = target;
      //to-do startMove(...)
      return;
    }
  }

  export function rollClicked(): void {
    log.info("Clicked on roll:");
    if (!isHumanTurn()) return;
    if (window.location.search === '?throwException') { // to test encoding a stack trace with sourcemap
      throw new Error("Throwing the error because URL has '?throwException'");
    }
    let steps = DieCombo.generate();



  }

  export function getTowerCount(col: number): number[] {
    let tc = state.board[col].count;
    return new Array(tc);
  }

  export function getPlayer(col: number):  string {
    return 'player' + state.board[col].status;
  }

  export function shouldSlowlyAppear(start: number, end: number): boolean {
    return state.delta &&
      state.delta.start === start && state.delta.end === end;
  }
}

angular.module('myApp', ['gameServices'])
  .run(function () {
    $rootScope['game'] = game;
    game.init();
  });
