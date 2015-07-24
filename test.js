// var section = "21 Torup-Trelleborg";
// var trail = "SL 2: Nord-sydleden";

// var trailsabbad = trail.substring(0, 4);
// var real_trail = trailsabbad.substring(0, 2);
// real_trail += trailsabbad.substring(3, 4);

// console.log(real_trail);

// real_trail += 'E';
// real_trail += section.substring(0,2);

// console.log(real_trail);

console.log(getName('1 Hejsan'));
console.log(getName('13 Hejsan'));
console.log(getName('13A Hejsan'));
console.log(getName('1A Hejsan'));

function getName(section) {
	var start = 0;
	var slut = 1;
	while(section.substring(start, slut) !== ' ') {
		start += 1;
		slut += 1;
	}
	return section.substring(slut, section.length);
}
