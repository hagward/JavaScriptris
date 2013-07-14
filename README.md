# JavaScriptris

The challenge was: how long will it take to write a JavaScript Tetris clone,
stranded on a desolate island with only an old laptop and a painfully slow and
unreliable mobile internet connection, and in addition barely possessing mere
basic JavaScript knowledge? The answer: two evenings and one morning.

At first I used a list containing the locked blocks in order to be able to
render them more quickly (in contrast to looping through the 10*16 'blocks'
matrix), but maintaining the list when deleting rows showed to be a bit
tricky. I then reckoned that was a completely unnecessary optimization and
saved myself from the headache by shoving it down the garbage chute. The score
system is from the original Tetris but the level system is completely improvised.

Feel free to [try it out](https://dl.dropboxusercontent.com/u/334931/game.html).

## Contribution

You are more than welcome to help out if you want to. Simply fork the project, make
some cool improvements (possibly creating a new branch first) and issue a pull request.
For example is multiplayer functionality currently being developed (see the 'multiplayer'
branch) by the means of [node.js](http://nodejs.org/) and [socket.io](http://socket.io/),
so feel free to experiment with ideas!

## License

JavaScriptris is licensed under the MIT license:

	Copyright (C) 2013 Anders Hagward

	Permission is hereby granted, free of charge, to any person obtaining a copy of
	this software and associated documentation files (the "Software"), to deal in the
	Software without restriction, including without limitation the rights to use,
	copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
	Software, and to permit persons to whom the Software is furnished to do so,
	subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
	INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
	PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
	HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
	OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
	SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.