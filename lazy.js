(function(context) {
  /**
   * The `Sequence` object provides a unified API encapsulating the notion of
   * zero or more consecutive elements in a collection, stream, etc.
   *
   * @constructor
   */
  function Sequence() {}

  /**
   * Create a new constructor function for a type inheriting from `Sequence`.
   *
   * @param {Function} ctor The constructor function.
   * @return {Function} A constructor for a new type inheriting from `Sequence`.
   */
  Sequence.inherit = function(ctor) {
    ctor = ctor || function() {};
    ctor.prototype = new Sequence();
    return ctor;
  };

  /**
   * For debug purposes only.
   * @debug
   */
  Sequence.prototype.depth = function() {
    return this.parent ? this.parent.depth() + 1 : 0;
  };

  /**
   * For debug purposes only.
   * @debug
   */
  Sequence.prototype.log = function(msg) {
    console.log(indent(this.depth()) + msg);
  };

  /**
   * Creates an array snapshot of a sequence.
   *
   * Note that for indefinite sequences, this method may raise an exception or
   * (worse) cause the environment to hang.
   *
   * @return {Array} An array containing the current contents of the sequence.
   *
   * @example
   * var range = Lazy.range(1, 10);
   * // => sequence: (1, 2, ..., 9)
   *
   * var array = range.toArray();
   * // => [1, 2, ..., 9]
   */
  Sequence.prototype.toArray = function() {
    var array = [];
    this.each(function(e) {
      array.push(e);
    });

    return array;
  };

  /**
   * Creates an object from a sequence of key/value pairs.
   *
   * @return {Object} An object with keys and values corresponding to the pairs
   *     of elements in the sequence.
   *
   * @example
   * var details = [
   *   ["first", "Dan"],
   *   ["last", "Tao"],
   *   ["age", 29]
   * ];
   *
   * var person = Lazy(details).toObject();
   * // => { first: "Dan", last: "Tao", age: 29 }
   */
  Sequence.prototype.toObject = function() {
    var object = {};
    this.each(function(e) {
      object[e[0]] = e[1];
    });

    return object;
  };

  /**
   * Iterates over this sequence and executes a function for every element.
   *
   * @param {Function} fn The function to call on each element in the sequence.
   *     Return false from the function to end the iteration.
   *
   * @example
   * var subordinates = [joe, bill, wendy];
   * Lazy(subordinates).forEach(function(s) { s.reprimand(); });
   */
  Sequence.prototype.forEach = function(fn) {
    this.each(fn);
  };

  /**
   * Creates a new sequence whose values are calculated by passing this sequence's
   * elements through some mapping function.
   *
   * @param {Function} mapFn The mapping function used to project this sequence's
   *     elements onto a new sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var odds = [1, 3, 5];
   * var evens = Lazy(odds).map(function(x) { return x + 1; });
   * // => sequence: (2, 4, 6)
   */
  Sequence.prototype.map = function(mapFn) {
    return new MappedSequence(this, mapFn);
  };

  Sequence.prototype.collect = Sequence.prototype.map;

  /**
   * Creates a new sequence whose values are calculated by accessing the specified
   * property from each element in this sequence.
   *
   * @param {string} propertyName The name of the property to access for every
   *     element in this sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var people = [
   *   { first: "Dan", last: "Tao" },
   *   { first: "Bob", last: "Smith" }
   * ];
   * var surnames = Lazy(people).pluck("last");
   * // => sequence: ("Tao", "Smith")
   */
  Sequence.prototype.pluck = function(propertyName) {
    return this.map(function(e) {
      return e[propertyName];
    });
  };

  /**
   * Creates a new sequence whose values are calculated by invoking the specified
   * function on each element in this sequence.
   *
   * @param {string} methodName The name of the method to invoke for every element
   *     in this sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * function Person(first, last) {
   *   this.fullName = function() {
   *     return first + " " + last;
   *   };
   * }
   *
   * var people = [
   *   new Person("Dan", "Tao"),
   *   new Person("Bob", "Smith")
   * ];
   *
   * var fullNames = Lazy(people).invoke("fullName");
   * // => sequence: ("Dan Tao", "Bob Smith")
   */
  Sequence.prototype.invoke = function(methodName) {
    return this.map(function(e) {
      return e[methodName]();
    });
  };

  /**
   * Creates a new sequence whose values are the elements of this sequence which
   * satisfy the specified predicate.
   *
   * @param {Function} filterFn The predicate to call on each element in this
   *     sequence, which returns true if the element should be included.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5, 6];
   * var evens = Lazy(numbers).select(function(x) { return x % 2 === 0; });
   * // => sequence: (2, 4, 6)
   */
  Sequence.prototype.select = function(filterFn) {
    return new FilteredSequence(this, filterFn);
  };

  Sequence.prototype.filter = Sequence.prototype.select;

  /**
   * Creates a new sequence whose values exclude the elements of this sequence
   * identified by the specified predicate.
   *
   * @param {Function} rejectFn The predicate to call on each element in this
   *     sequence, which returns true if the element should be omitted.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5, 6];
   * var odds = Lazy(numbers).reject(function(x) { return x % 2 === 0; });
   * // => sequence: (1, 3, 5)
   */
  Sequence.prototype.reject = function(rejectFn) {
    return this.filter(function(e) {
      return !rejectFn(e);
    });
  };

  /**
   * Creates a new sequence whose values are the elements of this sequence with
   * property names and values matching those of the specified object.
   *
   * @param {Object} properties The properties that should be found on every
   *     element that is to be included in this sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var people = [
   *   { first: "Dan", last: "Tao" },
   *   { first: "Bob", last: "Smith" }
   * ];
   * var dans = Lazy(people).where({ first: "Dan" });
   * // => sequence: ({ first: "Dan", last: "Tao" })
   */
  Sequence.prototype.where = function(properties) {
    return this.filter(function(e) {
      for (var p in properties) {
        if (e[p] !== properties[p]) {
          return false;
        }
      }
      return true;
    });
  };

  /**
   * Creates a new sequence with the same elements as this one, but to be iterated
   * in the opposite order.
   *
   * Note that in some (but not all) cases, the only way to create such a sequence
   * may require iterating the entire underlying source when `each` is called.
   *
   * @return {Sequence} The new sequence.
   *
   * @example
   * var alphabet = "abcdefghijklmnopqrstuvwxyz";
   * var alphabetBackwards = Lazy(alphabet).reverse();
   * // => sequence: ("z", "y", "x", ..., "a")
   */
  Sequence.prototype.reverse = function() {
    return new ReversedSequence(this);
  };

  /**
   * Creates a new sequence with all of the elements of this one, plus those of
   * the given array(s).
   *
   * @param {...*} var_args One or more values (or arrays of values) to use for
   *     additional items after this sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var left = [1, 2, 3];
   * var right = [4, 5, 6];
   * var both = Lazy(left).concat(right);
   * // => sequence: (1, 2, 3, 4, 5, 6)
   */
  Sequence.prototype.concat = function(var_args) {
    return new ConcatenatedSequence(this, Array.prototype.slice.call(arguments, 0));
  };

  /**
   * Creates a new sequence comprising the first N elements from this sequence, OR
   * (if N is undefined) simply returns the first element of this sequence.
   *
   * @param {number=} count The number of elements to take from this sequence. If
   *     this value exceeds the length of the sequence, the resulting sequence
   *     will be essentially the same as this one.
   * @result {*} The new sequence (or the first element from this sequence if
   *     no count was given).
   *
   * @example
   * function powerOfTwo(exp) {
   *   return Math.pow(2, exp);
   * }
   *
   * var firstTenPowersOf2 = Lazy.generate(powerOfTwo).first(10);
   * // => sequence: (1, 2, 4, ..., 512)
   */
  Sequence.prototype.first = function(count) {
    if (typeof count === "undefined") {
      return getFirst(this);
    }

    return new TakeSequence(this, count);
  };

  Sequence.prototype.head =
  Sequence.prototype.take = Sequence.prototype.first;

  /**
   * Creates a new sequence comprising all but the last N elements of this
   * sequence.
   *
   * @param {number=} count The number of items to omit from the end of the
   *     sequence (defaults to 1).
   * @return {Sequence} The new sequence.
   *
   * @example
   * var produce = [apple, banana, carrot, durian];
   * var edibleProduce = Lazy(produce).initial();
   * // => sequence: (apple, banana, carrot)
   */
  Sequence.prototype.initial = function(count) {
    if (typeof count === "undefined") {
      count = 1;
    }
    return this.take(this.length() - count);
  };

  /**
   * Creates a new sequence comprising the last N elements of this sequence, OR
   * (if N is undefined) simply returns the last element of this sequence.
   *
   * @param {number=} count The number of items to take from the end of the
   *     sequence.
   * @return {*} The new sequence (or the last element from this sequence
   *     if no count was given).
   *
   * @example
   * var siblings = [lauren, adam, daniel, happy];
   * var favorite = Lazy(siblings).last();
   * // => happy
   */
  Sequence.prototype.last = function(count) {
    if (typeof count === "undefined") {
      return this.reverse().first();
    }
    return this.reverse().take(count).reverse();
  };

  /**
   * Returns the first element in this sequence with property names and values
   * matching those of the specified object.
   *
   * @param {Object} properties The properties that should be found on some
   *     element in this sequence.
   * @return {*} The found element, or undefined if none exists in this
   *     sequence.
   *
   * @example
   * var words = ["foo", "bar"];
   * var foo = Lazy(words).findWhere({ 0: "f" });
   * // => "foo"
   */
  Sequence.prototype.findWhere = function(properties) {
    return this.where(properties).first();
  };

  /**
   * Creates a new sequence comprising all but the first N elements of this
   * sequence.
   *
   * @param {number=} count The number of items to omit from the beginning of the
   *     sequence (defaults to 1).
   * @return {Sequence} The new sequence.
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
   * var lastFive = Lazy(numbers).rest(5);
   * // #=> sequence: (6, 7, 8, 9, 10)
   */
  Sequence.prototype.rest = function(count) {
    return new DropSequence(this, count);
  };

  Sequence.prototype.tail =
  Sequence.prototype.drop = Sequence.prototype.rest;

  /**
   * Creates a new sequence with the same elements as this one, but ordered
   * according to the values returned by the specified function.
   *
   * @param {Function} sortFn The function to call on the elements in this
   *     sequence, in order to sort them.
   * @return {Sequence} The new sequence.
   *
   * function population(country) {
   *   return country.pop;
   * }
   *
   * function area(country) {
   *   return country.sqkm;
   * }
   *
   * var countries = [
   *   { name: "USA", pop: 320000000, sqkm: 9600000 },
   *   { name: "Brazil", pop: 194000000, sqkm: 8500000 },
   *   { name: "Nigeria", pop: 174000000, sqkm: 924000 },
   *   { name: "China", pop: 1350000000, sqkm: 9700000 },
   *   { name: "Russia", pop: 143000000, sqkm: 17000000 },
   *   { name: "Australia", pop: 23000000, sqkm: 7700000 }
   * ];
   *
   * var mostPopulous = Lazy(countries).sortBy(population).last(3);
   * // => sequence: (Brazil, USA, China)
   *
   * var largest = Lazy(countries).sortBy(area).last(3);
   * // => sequence: (USA, China, Russia)
   */
  Sequence.prototype.sortBy = function(sortFn) {
    return new SortedSequence(this, sortFn);
  };

  /**
   * Creates a new sequence comprising the elements in this one, grouped
   * together according to some key. The elements of the new sequence are pairs
   * of the form `[key, values]` where `values` is an array containing all of
   * the elements in this sequence with the same key.
   *
   * @param {Function} keyFn The function to call on the elements in this
   *     sequence to obtain a key by which to group them.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
   * var oddsAndEvens = Lazy(numbers).groupBy(function(x) {
   *   return x % 2 == 1 ? "odd" : "even";
   * });
   * // => sequence: (["odd", [1, 3, ..., 9]], ["even", [2, 4, ..., 10]])
   */
  Sequence.prototype.groupBy = function(keyFn) {
    return new GroupedSequence(this, keyFn);
  };

  /**
   * Creates a new sequence containing the unique keys of all the elements in
   * this sequence, each paired with a number representing the number of times
   * that key appears in the sequence.
   *
   * @param {Function} keyFn The function to call on the elements in this
   *     sequence to obtain a key by which to count them.
   * @return {Sequence} The new sequence.
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5];
   * var oddsAndEvens = Lazy(numbers).countBy(function(x) {
   *   return x % 2 == 1 ? "odd" : "even";
   * });
   * // => sequence: (["odd", 3], ["even", 2])
   */
  Sequence.prototype.countBy = function(keyFn) {
    return new CountedSequence(this, keyFn);
  };

  /**
   * Creates a new sequence with every unique element from this one appearing
   * exactly once (i.e., with duplicates removed).
   *
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy([1, 2, 2, 3, 3, 3]).uniq();
   * // => sequence: (1, 2, 3)
   */
  Sequence.prototype.uniq = function() {
    return new UniqueSequence(this);
  };

  Sequence.prototype.unique = Sequence.prototype.uniq;

  /**
   * Creates a new sequence by combining the elements from this sequence with
   * corresponding elements from the specified array(s).
   *
   * @param {...Array} var_args One or more arrays of elements to combine with
   *     those of this sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy([1, 2]).zip([3, 4]);
   * // => sequence: ([1, 3], [2, 4])
   */
  Sequence.prototype.zip = function(var_args) {
    return new ZippedSequence(this, Array.prototype.slice.call(arguments, 0));
  };

  /**
   * Creates a new sequence with the same elements as this one, in a randomized
   * order.
   *
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy([1, 2, 3, 4, 5]).shuffle();
   * // => sequence: (2, 3, 5, 4, 1)
   */
  Sequence.prototype.shuffle = function() {
    return new ShuffledSequence(this);
  };

  /**
   * Creates a new sequence with every element from this sequence, and with arrays
   * exploded so that a sequence of arrays (of arrays) becomes a flat sequence of
   * values.
   *
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy([1, [2, 3], [4, [5]]]).flatten();
   * // => sequence: (1, 2, 3, 4, 5)
   */
  Sequence.prototype.flatten = function() {
    return new FlattenedSequence(this);
  };

  /**
   * Creates a new sequence with the same elements as this one, except for all
   * falsy values (false, 0, "", null, and undefined).
   *
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy(["foo", null, "bar", undefined]).compact();
   * // => sequence: ("foo", "bar")
   */
  Sequence.prototype.compact = function() {
    return this.filter(function(e) { return !!e; });
  };

  /**
   * Creates a new sequence with all the elements of this sequence that are not
   * also among the specified arguments.
   *
   * @param {...*} var_args The values, or array(s) of values, to be excluded from the
   *     resulting sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy([1, 2, 3, 4, 5]).without(2, 3);
   * // => sequence: (1, 4, 5)
   */
  Sequence.prototype.without = function(var_args) {
    return new WithoutSequence(this, Array.prototype.slice.call(arguments, 0));
  };

  Sequence.prototype.difference = Sequence.prototype.without;

  /**
   * Creates a new sequence with all the unique elements either in this sequence
   * or among the specified arguments.
   *
   * @param {...*} var_args The values, or array(s) of values, to be additionally
   *     included in the resulting sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy(["foo", "bar"]).union(["bar", "baz"]);
   * // => sequence: ("foo", "bar", "baz")
   */
  Sequence.prototype.union = function(var_args) {
    return this.concat(var_args).uniq();
  };

  /**
   * Creates a new sequence with all the elements of this sequence that also
   * appear among the specified arguments.
   *
   * @param {...*} var_args The values, or array(s) of values, in which elements
   *     from this sequence must also be included to end up in the resulting sequence.
   * @return {Sequence} The new sequence.
   *
   * @example
   * Lazy(["foo", "bar"]).intersection(["bar", "baz"]);
   * // => sequence: ("bar")
   */
  Sequence.prototype.intersection = function(var_args) {
    return new IntersectionSequence(this, Array.prototype.slice.call(arguments, 0));
  };

  /**
   * Checks whether every element in this sequence satisfies a given predicate.
   *
   * @param {Function} predicate A function to call on (potentially) every element
   *     in this sequence.
   * @return {boolean} True if `predicate` returns true for every element in the
   *     sequence (or the sequence is empty). False if `predicate` returns false
   *     for at least one element.
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5];
   *
   * var allEven = Lazy(numbers).every(function(x) { return x % 2 === 0; });
   * // => false
   *
   * var allPositive = Lazy(numbers).every(function(x) { return x > 0; });
   * // => true
   */
  Sequence.prototype.every = function(predicate) {
    var success = true;
    this.each(function(e) {
      if (!predicate(e)) {
        success = false;
        return false;
      }
    });
    return success;
  };

  Sequence.prototype.all = Sequence.prototype.every;

  /**
   * Checks whether at least one element in this sequence satisfies a given
   * predicate (or, if no predicate is specified, whether the sequence contains at
   * least one element).
   *
   * @param {Function=} predicate A function to call on (potentially) every element
   *     in this sequence.
   * @return {boolean} True if `predicate` returns true for at least one element
   *     in the sequence. False if `predicate` returns false for every element (or
   *     the sequence is empty).
   *
   * @example
   * var numbers = [1, 2, 3, 4, 5];
   *
   * var someEven = Lazy(numbers).some(function(x) { return x % 2 === 0; });
   * // => true
   *
   * var someNegative = Lazy(numbers).some(function(x) { return x < 0; });
   * // => false
   */
  Sequence.prototype.some = function(predicate) {
    if (!predicate) {
      predicate = function() { return true; };
    }

    var success = false;
    this.each(function(e) {
      if (predicate(e)) {
        success = true;
        return false;
      }
    });
    return success;
  };

  Sequence.prototype.any = Sequence.prototype.some;

  /**
   * Checks whether the sequence has no elements.
   *
   * @return {boolean} True if the sequence is empty, false if it contains at
   *     least one element.
   *
   * @example
   * Lazy([]).isEmpty();
   * // => true
   *
   * Lazy([1, 2, 3]).isEmpty();
   * // => false
   */
  Sequence.prototype.isEmpty = function() {
    return !this.any();
  };

  /**
   * Performs (at worst) a linear search from the head of this sequence,
   * returning the first index at which the specified value is found.
   *
   * @param {*} value The element to search for in the sequence.
   * @return {number} The index within this sequence where the given value is
   *     located, or -1 if the sequence doesn't contain the value.
   *
   * @example
   * Lazy(["foo", "bar", "baz"]).indexOf("bar");
   * // => 1
   *
   * Lazy([1, 2, 3]).indexOf(4);
   * // => -1
   *
   * Lazy([1, 2, 3]).map(function(x) { return x * 2; }).indexOf(2);
   * // => 0
   */
  Sequence.prototype.indexOf = function(value) {
    var index = 0;
    var foundIndex = -1;
    this.each(function(e) {
      if (e === value) {
        foundIndex = index;
        return false;
      }
      ++index;
    });
    return foundIndex;
  };

  /**
   * Performs (at worst) a linear search from the tail of this sequence,
   * returning the last index at which the specified value is found.
   *
   * @param {*} value The element to search for in the sequence.
   * @return {number} The last index within this sequence where the given value
   *     is located, or -1 if the sequence doesn't contain the value.
   *
   * @example
   * Lazy(["a", "b", "c", "b", "a"]).lastIndexOf("b");
   * // => 3
   *
   * Lazy([1, 2, 3]).lastIndexOf(0);
   * // => -1
   */
  Sequence.prototype.lastIndexOf = function(value) {
    var index = this.reverse().indexOf(value);
    if (index !== -1) {
      index = this.length() - index - 1;
    }
    return index;
  };

  /**
   * Performs a binary search of this sequence, returning the lowest index where
   * the given value is either found, or where it belongs (if it is not already
   * in the sequence).
   *
   * This method assumes the sequence is in sorted order and will fail
   * otherwise.
   *
   * @param {*} value The element to search for in the sequence.
   * @return {number} An index within this sequence where the given value is
   *     located, or where it belongs in sorted order.
   *
   * @example
   * Lazy([1, 3, 6, 9, 12, 15, 18, 21]).sortedIndex(3);
   * // => 1
   */
  Sequence.prototype.sortedIndex = function(value) {
    var lower = 0;
    var upper = this.length();
    var i;

    while (lower < upper) {
      i = (lower + upper) >>> 1;
      if (compare(this.get(i), value) === -1) {
        lower = i + 1;
      } else {
        upper = i;
      }
    }
    return lower;
  };

  /**
   * Checks whether the given value is in this sequence.
   *
   * @param {*} value The element to search for in the sequence.
   * @return {boolean} True if the sequence contains the value, false if not.
   *
   * @example
   * var numbers = [5, 10, 15, 20];
   *
   * Lazy(numbers).contains(15);
   * // => true
   *
   * Lazy(numbers).contains(13);
   * // => false
   */
  Sequence.prototype.contains = function(value) {
    return this.indexOf(value) !== -1;
  };

  /**
   * Aggregates a sequence into a single value according to some accumulator
   * function.
   *
   * @param {Function} aggregator The function through which to pass every element
   *     in the sequence. For every element, the function will be passed the total
   *     aggregated result thus far and the element itself, and should return a
   *     new aggregated result.
   * @param {*=} memo The starting value to use for the aggregated result
   *     (defaults to the first element in the sequence).
   * @return {*} The result of the aggregation.
   *
   * @example
   * var numbers = [5, 10, 15, 20];
   *
   * var sum = Lazy(numbers).reduce(function(x, y) { return x + y; }, 0);
   * // => 50
   */
  Sequence.prototype.reduce = function(aggregator, memo) {
    if (arguments.length < 2) {
      return this.tail().reduce(aggregator, this.head());
    }

    this.each(function(e, i) {
      memo = aggregator(memo, e, i);
    });
    return memo;
  };

  Sequence.prototype.inject =
  Sequence.prototype.foldl = Sequence.prototype.reduce;

  /**
   * Aggregates a sequence, from the tail, into a single value according to some
   * accumulator function.
   *
   * @param {Function} aggregator The function through which to pass every element
   *     in the sequence. For every element, the function will be passed the total
   *     aggregated result thus far and the element itself, and should return a
   *     new aggregated result.
   * @param {*} memo The starting value to use for the aggregated result.
   * @return {*} The result of the aggregation.
   *
   * @example
   * var letters = "abcde";
   *
   * var backwards = Lazy(letters).reduceRight(function(x, y) { return x + y; });
   * // => "edcba"
   */
  Sequence.prototype.reduceRight = function(aggregator, memo) {
    if (arguments.length < 2) {
      return this.initial(1).reduceRight(aggregator, this.last());
    }

    // This bothers me... but frankly, calling reverse().reduce() is potentially
    // going to eagerly evaluate the sequence anyway; so it's really not an issue.
    var i = this.length() - 1;
    return this.reverse().reduce(function(m, e) {
      return aggregator(m, e, i--);
    }, memo);
  };

  Sequence.prototype.foldr = Sequence.prototype.reduceRight;

  /**
   * Seaches for the first element in the sequence satisfying a given predicate.
   *
   * @param {Function} predicate A function to call on (potentially) every element
   *     in the sequence.
   * @return {*} The first element in the sequence for which `predicate` returns
   *     true, or undefined if no such element is found.
   *
   * @example
   * var numbers = [5, 6, 7, 8, 9, 10];
   *
   * Lazy(numbers).find(function(x) { return x % 3 === 0; });
   * // => 6
   *
   * Lazy(numbers).find(function(x) { return x < 0; });
   * // => undefined
   */
  Sequence.prototype.find = function(predicate) {
    return this.filter(predicate).first();
  };

  Sequence.prototype.detect = Sequence.prototype.find;

  /**
   * Gets the minimum value in the sequence.
   *
   * TODO: This should support a value selector.
   *
   * @return {*} The element with the lowest value in the sequence.
   *
   * @example
   * Lazy([6, 18, 2, 49, 34]).min();
   * // => 2
   */
  Sequence.prototype.min = function() {
    return this.reduce(function(least, value) {
      return value < least ? value : least;
    });
  };

  /**
   * Gets the maximum value in the sequence.
   *
   * TODO: This should support a value selector.
   *
   * @return {*} The element with the highest value in the sequence.
   *
   * @example
   * Lazy([6, 18, 2, 49, 34]).max();
   * // => 49
   */
  Sequence.prototype.max = function() {
    return this.reduce(function(greatest, value) {
      return value > greatest ? value : greatest;
    });
  };

  /**
   * Gets the sum of the values in the sequence.
   *
   * TODO: This should support a value selector.
   *
   * @return {*} The sum.
   *
   * @example
   * Lazy([1, 2, 3, 4]).sum();
   * // => 10
   */
  Sequence.prototype.sum = function() {
    return this.reduce(function(sum, value) {
      return sum += value;
    }, 0);
  };

  /**
   * Creates a string from joining together all of the elements in this sequence,
   * separated by the given delimiter.
   *
   * @param {string} delimiter The separator to insert between every element from
   *     this sequence in the resulting string.
   * @return {string} The delimited string.
   *
   * @example
   * Lazy([6, 29, 1984]).join("/");
   * // => "6/29/1984"
   */
  Sequence.prototype.join = function(delimiter) {
    var str = "";
    this.each(function(e) {
      if (str.length > 0) {
        str += delimiter;
      }
      str += e;
    });
    return str;
  };

  /**
   * Creates an iterator object with two methods, `moveNext` -- returning true or
   * false -- and `current` -- returning the current value.
   *
   * This method is used when asynchronously iterating over sequences. Any type
   * inheriting from `Sequence` must implement this method or it can't support
   * asynchronous iteration.
   *
   * @return {Iterator} An iterator object.
   *
   * @example
   * var iterator = Lazy([1, 2]).getIterator();
   *
   * iterator.moveNext();
   * // => true
   *
   * iterator.current();
   * // => 1
   *
   * iterator.moveNext();
   * // => true
   *
   * iterator.current();
   * // => 2
   *
   * iterator.moveNext();
   * // => false
   */
  Sequence.prototype.getIterator = function() {
    return new Iterator(this);
  };

  /**
   * Creates a sequence, with the same elements as this one, that will be iterated
   * over asynchronously when calling `each`.
   *
   * @param {number=} interval The approximate period, in milliseconds, that
   *     should elapse between each element in the resulting sequence. Omitting
   *     this argument will result in the fastest possible asynchronous iteration.
   * @return {Sequence} The new asynchronous sequence.
   *
   * @example
   * Lazy([1, 2, 3]).async(1000).each(function(x) {
   *   console.log(x);
   * });
   * // (logs the numbers 1, 2, and 3 to the console, one second apart)
   */
  Sequence.prototype.async = function(interval) {
    return new AsyncSequence(this, interval);
  };

  /**
   * A CachingSequence is a {@link Sequence} that (probably) must fully evaluate
   * the underlying sequence when {@link each} is called. For this reason, it
   * provides a {@link cache} method to fully populate an array that can then be
   * referenced internally.
   *
   * Frankly, I question the wisdom in this sequence type and think I will
   * probably refactor this out in the near future. Most likely I will replace it
   * with something like an 'IteratingSequence' which must expose a 'getIterator'
   * and not provide {@link get} or {@link length} at all. But we'll see.
   *
   * @constructor
   */
  function CachingSequence() {}

  CachingSequence.prototype = new Sequence();

  /**
   * Create a new constructor function for a type inheriting from
   * {@link CachingSequence}.
   *
   * @param {Function} ctor The constructor function.
   * @return {Function} A constructor for a new type inheriting from
   *     {@link CachingSequence}.
   */
  CachingSequence.inherit = function(ctor) {
    ctor.prototype = new CachingSequence();
    return ctor;
  };

  /**
   * Fully evaluates the sequence and returns a cached result.
   *
   * @return {Array} The cached array, fully populated with the elements in this
   *     sequence.
   */
  CachingSequence.prototype.cache = function() {
    if (!this.cached) {
      this.cached = this.toArray();
    }
    return this.cached;
  };

  /**
   * For internal use only.
   */
  CachingSequence.prototype.get = function(i) {
    return this.cache()[i];
  };

  /**
   * For internal use only.
   */
  CachingSequence.prototype.length = function() {
    return this.cache().length;
  };

  var MappedSequence = Sequence.inherit(function(parent, mapFn) {
    this.parent = parent;
    this.mapFn  = mapFn;
  });

  MappedSequence.prototype.each = function(fn) {
    var mapFn = this.mapFn;
    this.parent.each(function(e, i) {
      return fn(mapFn(e, i), i);
    });
  };

  /**
   * @constructor
   * @param {Sequence=} parent
   * @param {Function=} filterFn
   */
  function FilteredSequence(parent, filterFn) {
    this.parent   = parent;
    this.filterFn = filterFn;
  }

  FilteredSequence.prototype = new CachingSequence();

  FilteredSequence.prototype.getIterator = function() {
    return new FilteringIterator(this.parent, this.filterFn);
  };

  FilteredSequence.prototype.each = function(fn) {
    var filterFn = this.filterFn;

    this.parent.each(function(e, i) {
      if (filterFn(e, i)) {
        return fn(e, i);
      }
    });
  };

  var ReversedSequence = CachingSequence.inherit(function(parent) {
    this.parent = parent;
  });

  ReversedSequence.prototype.each = function(fn) {
    var parentArray = this.parent.toArray(),
        i = parentArray.length;
    while (--i >= 0) {
      if (fn(parentArray[i]) === false) {
        break;
      }
    }
  };

  var ConcatenatedSequence = Sequence.inherit(function(parent, arrays) {
    this.parent = parent;
    this.arrays = arrays;
  });

  ConcatenatedSequence.prototype.each = function(fn) {
    var done = false,
        i = 0;

    this.parent.each(function(e) {
      if (fn(e, i++) === false) {
        done = true;
        return false;
      }
    });

    if (!done) {
      Lazy(this.arrays).flatten().each(function(e) {
        if (fn(e, i++) === false) {
          return false;
        }
      });
    }
  };

  var TakeSequence = CachingSequence.inherit(function(parent, count) {
    this.parent = parent;
    this.count  = count;
  });

  TakeSequence.prototype.each = function(fn) {
    var self = this,
        i = 0;
    self.parent.each(function(e) {
      var result = fn(e, i);
      if (++i >= self.count) { return false; }
      return result;
    });
  };

  var DropSequence = CachingSequence.inherit(function(parent, count) {
    this.parent = parent;
    this.count  = typeof count === "number" ? count : 1;
  });

  DropSequence.prototype.each = function(fn) {
    var self = this,
        i = 0;
    self.parent.each(function(e) {
      if (i++ < self.count) { return; }
      return fn(e);
    });
  };

    var SortedSequence = CachingSequence.inherit(function(parent, sortFn) {
      this.parent = parent;
      this.sortFn = sortFn;
    });

  SortedSequence.prototype.each = function(fn) {
    var sortFn = this.sortFn,
        sorted = this.parent.toArray(),
        i = -1;

    sorted.sort(function(x, y) { return compare(x, y, sortFn); });

    while (++i < sorted.length) {
      if (fn(sorted[i], i) === false) {
        break;
      }
    }
  };

  var ShuffledSequence = CachingSequence.inherit(function(parent) {
    this.parent = parent;
  });

  ShuffledSequence.prototype.each = function(fn) {
    var shuffled = this.parent.toArray(),
        floor = Math.floor,
        random = Math.random,
        j = 0;

    for (var i = shuffled.length - 1; i > 0; --i) {
      swap(shuffled, i, floor(random() * i) + 1);
      if (fn(shuffled[i], j++) === false) {
        return;
      }
    }
    fn(shuffled[0], j);
  };

  // TODO: This should really return an object, not an jagged array. Will
  // require a bit of rework -- but hopefully not too much!
  var GroupedSequence = CachingSequence.inherit(function(parent, keyFn) {
    this.each = function(fn) {
      var grouped = {};
      parent.each(function(e) {
        var key = keyFn(e);
        if (!grouped[key]) {
          grouped[key] = [e];
        } else {
          grouped[key].push(e);
        }
      });
      for (var key in grouped) {
        if (fn([key, grouped[key]]) === false) {
          break;
        }
      }
    };
  });

  // TODO: This should return an object too (like GroupBySequence).
  var CountedSequence = CachingSequence.inherit(function(parent, keyFn) {
    this.each = function(fn) {
      var grouped = {};
      parent.each(function(e) {
        var key = keyFn(e);
        if (!grouped[key]) {
          grouped[key] = 1;
        } else {
          grouped[key] += 1;
        }
      });
      for (var key in grouped) {
        fn([key, grouped[key]]);
      }
    };
  });

  var UniqueSequence = CachingSequence.inherit(function(parent) {
    this.parent = parent;
  });

  UniqueSequence.prototype.each = function(fn) {
    var cache = [],
        find  = contains,
        i     = 0;
    this.parent.each(function(e) {
      if (!find(cache, e)) {
        cache.push(e);
        return fn(e, i++);
      }
    });
  };

  var FlattenedSequence = CachingSequence.inherit(function(parent) {
    this.parent = parent;
  });

  FlattenedSequence.prototype.each = function(fn) {
    // Hack: store the index in a tiny array so we can increment it from outside
    // this function.
    var index = [0];

    this.parent.each(function(e) {
      if (e instanceof Array) {
        return recursiveForEach(e, fn, index);
      } else {
        return fn(e, index[0]++);
      }
    });
  };

  var WithoutSequence = CachingSequence.inherit(function(parent, values) {
    this.parent = parent;
    this.values = values;
  });

  WithoutSequence.prototype.each = function(fn) {
    var set = createSet(this.values),
        i = 0;
    this.parent.each(function(e) {
      if (!set.contains(e)) {
        return fn(e, i++);
      }
    });
  };

  var IntersectionSequence = CachingSequence.inherit(function(parent, arrays) {
    this.parent = parent;
    this.arrays = arrays;
  });

  IntersectionSequence.prototype.each = function(fn) {
    var sets = Lazy(this.arrays)
      .map(function(values) { return Lazy(values).uniq().toArray(); })
      .toArray();

    var find = contains,
        i = 0;

    this.parent.each(function(e) {
      var j = -1;
      while (++j < sets.length) {
        if (!find(sets[j], e)) {
          return;
        }
      }
      return fn(e, i++);
    });
  };

  var ZippedSequence = CachingSequence.inherit(function(parent, arrays) {
    this.parent = parent;
    this.arrays = arrays;
  });

  ZippedSequence.prototype.each = function(fn) {
    var arrays = this.arrays,
        i = 0;
    this.parent.each(function(e) {
      var group = [e];
      for (var j = 0; j < arrays.length; ++j) {
        if (arrays[j].length > i) {
          group.push(arrays[j][i]);
        }
      }
      return fn(group, i++);
    });
  };

  /**
   * The Iterator object provides an API for iterating over a sequence.
   *
   * @constructor
   */
  function Iterator(sequence) {
    this.sequence = sequence;
    this.index = -1;
  }

  /**
   * Gets the current item this iterator is pointing to.
   *
   * @return {*} The current item.
   */
  Iterator.prototype.current = function() {
    return this.sequence.get(this.index);
  };

  /**
   * Moves the iterator to the next item in a sequence, if possible.
   *
   * @return {boolean} True if the iterator is able to move to a new item, or else
   *     false.
   */
  Iterator.prototype.moveNext = function() {
    if (this.index >= this.sequence.length() - 1) {
      return false;
    }

    ++this.index;
    return true;
  };

  /**
   * @constructor
   */
  function FilteringIterator(sequence, filterFn) {
    this.iterator = sequence.getIterator();
    this.filterFn = filterFn;
  }

  FilteringIterator.prototype.current = function() {
    return this.value;
  };

  FilteringIterator.prototype.moveNext = function() {
    var iterator = this.iterator,
        filterFn = this.filterFn,
        value;

    while (iterator.moveNext()) {
      value = iterator.current();
      if (filterFn(value)) {
        this.value = value;
        return true;
      }
    }

    this.value = undefined;
    return false;
  };

  /**
   * @constructor
   * @param {string|StringLikeSequence} source
   */
  function CharIterator(source) {
    this.source = source;
    this.index = -1;
  }

  CharIterator.prototype.current = function() {
    return this.source.charAt(this.index);
  };

  CharIterator.prototype.moveNext = function() {
    return (++this.index < this.source.length);
  };

  /**
   * @constructor
   */
  function StringMatchIterator(source, pattern) {
    this.source = source;

    // clone the RegExp
    this.pattern = eval("" + pattern + (!pattern.global ? "g" : ""));
  }

  StringMatchIterator.prototype.current = function() {
    return this.match[0];
  };

  StringMatchIterator.prototype.moveNext = function() {
    return !!(this.match = this.pattern.exec(this.source));
  };

  /**
   * @constructor
   */
  function SplitWithRegExpIterator(source, pattern) {
    this.source = source;

    // clone the RegExp
    this.pattern = eval("" + pattern + (!pattern.global ? "g" : ""));
  }

  SplitWithRegExpIterator.prototype.current = function() {
    return this.source.substring(this.start, this.end);
  };

  SplitWithRegExpIterator.prototype.moveNext = function() {
    if (!this.pattern) {
      return false;
    }

    var match = this.pattern.exec(this.source);

    if (match) {
      this.start = this.nextStart ? this.nextStart : 0;
      this.end = match.index;
      this.nextStart = match.index + match[0].length;
      return true;

    } else if (this.pattern) {
      this.start = this.nextStart;
      this.end = undefined;
      this.nextStart = undefined;
      this.pattern = undefined;
      return true;
    }

    return false;
  };

  /**
   * @constructor
   */
  function SplitWithStringIterator(source, delimiter) {
    this.source = source;
    this.delimiter = delimiter;
  }

  SplitWithStringIterator.prototype.current = function() {
    return this.source.substring(this.leftIndex, this.rightIndex);
  };

  SplitWithStringIterator.prototype.moveNext = function() {
    if (!this.finished) {
      this.leftIndex = typeof this.leftIndex !== "undefined" ?
        this.rightIndex + this.delimiter.length :
        0;
      this.rightIndex = this.source.indexOf(this.delimiter, this.leftIndex);
    }

    if (this.rightIndex === -1) {
      this.finished = true;
      this.rightIndex = undefined;
      return true;
    }

    return !this.finished;
  };

  /**
   * An `ArrayLikeSequence` is a {@link Sequence} that provides random access to its
   * elements. This extends the API for iterating with the additional methods
   * `get` and `length`, allowing a sequence to act as a "view" into a collection
   * or other indexed data source.
   *
   * @constructor
   */
  function ArrayLikeSequence() {}

  ArrayLikeSequence.prototype = new Sequence();

  /**
   * Create a new constructor function for a type inheriting from
   * {@link ArrayLikeSequence}.
   *
   * @param {Function} ctor The constructor function.
   * @return {Function} A constructor for a new type inheriting from
   *     {@link ArrayLikeSequence}.
   */
  ArrayLikeSequence.inherit = function(ctor) {
    ctor.prototype = new ArrayLikeSequence();
    return ctor;
  };

  /**
   * Returns the element at the specified index.
   *
   * @param {number} i The index to access.
   * @return {*} The element.
   */
  ArrayLikeSequence.prototype.get = function(i) {
    return this.parent.get(i);
  };

  /**
   * Returns the length of the sequence.
   *
   * @return {number} The length.
   */
  ArrayLikeSequence.prototype.length = function() {
    return this.parent.length();
  };

  /**
   * An optimized version of {@link Sequence.each}.
   */
  ArrayLikeSequence.prototype.each = function(fn) {
    var length = this.length(),
        i = -1;
    while (++i < length) {
      if (fn(this.get(i), i) === false) {
        break;
      }
    }
  };

  /**
   * An optimized version of {@link Sequence.map}, which creates an
   * {@link ArrayLikeSequence} so that the result still provides random access.
   */
  ArrayLikeSequence.prototype.map =
  ArrayLikeSequence.prototype.collect = function(mapFn) {
    return new IndexedMappedSequence(this, mapFn);
  };

  /**
   * An optimized version of {@link Sequence.filter}.
   */
  ArrayLikeSequence.prototype.filter =
  ArrayLikeSequence.prototype.select = function(filterFn) {
    return new IndexedFilteredSequence(this, filterFn);
  };

  /**
   * An optimized version of {@link Sequence.reverse}, which creates an
   * {@link ArrayLikeSequence} so that the result still provides random access.
   */
  ArrayLikeSequence.prototype.reverse = function() {
    return new IndexedReversedSequence(this);
  };

  /**
   * An optimized version of {@link Sequence.first}, which creates an
   * {@link ArrayLikeSequence} so that the result still provides random access.
   *
   * @param {number=} count
   */
  ArrayLikeSequence.prototype.first = function(count) {
    if (typeof count === "undefined") {
      return this.get(0);
    }

    return new IndexedTakeSequence(this, count);
  };

  ArrayLikeSequence.prototype.head =
  ArrayLikeSequence.prototype.take =
  ArrayLikeSequence.prototype.first;

  /**
   * An optimized version of {@link Sequence.rest}, which creates an
   * {@link ArrayLikeSequence} so that the result still provides random access.
   *
   * @param {number=} count
   */
  ArrayLikeSequence.prototype.rest = function(count) {
    return new IndexedDropSequence(this, count);
  };

  ArrayLikeSequence.prototype.tail =
  ArrayLikeSequence.prototype.drop = ArrayLikeSequence.prototype.rest;

  var IndexedMappedSequence = ArrayLikeSequence.inherit(function(parent, mapFn) {
    this.parent = parent;
    this.mapFn  = mapFn;
  });

  IndexedMappedSequence.prototype.get = function(i) {
    return this.mapFn(this.parent.get(i), i);
  };

  /**
   * @constructor
   */
  function IndexedFilteredSequence(parent, filterFn) {
    this.parent   = parent;
    this.filterFn = filterFn;
  }

  IndexedFilteredSequence.prototype = new FilteredSequence();

  IndexedFilteredSequence.prototype.each = function(fn) {
    var parent = this.parent,
        filterFn = this.filterFn,
        length = this.parent.length(),
        i = -1,
        e;

    while (++i < length) {
      e = parent.get(i);
      if (filterFn(e, i) && fn(e, i) === false) {
        break;
      }
    }
  };

  var IndexedReversedSequence = ArrayLikeSequence.inherit(function(parent) {
    this.parent = parent;
  });

  IndexedReversedSequence.prototype.get = function(i) {
    return this.parent.get(this.length() - i - 1);
  };

  var IndexedTakeSequence = ArrayLikeSequence.inherit(function(parent, count) {
    this.parent = parent;
    this.count  = count;
  });

  IndexedTakeSequence.prototype.length = function() {
    var parentLength = this.parent.length();
    return this.count <= parentLength ? this.count : parentLength;
  };

  var IndexedDropSequence = ArrayLikeSequence.inherit(function(parent, count) {
    this.parent = parent;
    this.count  = typeof count === "number" ? count : 1;
  });

  IndexedDropSequence.prototype.get = function(i) {
    return this.parent.get(this.count + i);
  };

  IndexedDropSequence.prototype.length = function() {
    var parentLength = this.parent.length();
    return this.count <= parentLength ? parentLength - this.count : 0;
  };

  /**
   * ArrayWrapper is the most basic {@link Sequence}. It directly wraps an array
   * and implements the same methods as {@link ArrayLikeSequence}, but more
   * efficiently.
   *
   * @constructor
   */
  function ArrayWrapper(source) {
    this.source = source;
  }

  ArrayWrapper.prototype = new ArrayLikeSequence();

  /**
   * Returns the element at the specified index in the source array.
   *
   * @param {number} i The index to access.
   * @return {*} The element.
   */
  ArrayWrapper.prototype.get = function(i) {
    return this.source[i];
  };

  /**
   * Returns the length of the source array.
   *
   * @return {number} The length.
   */
  ArrayWrapper.prototype.length = function() {
    return this.source.length;
  };

  /**
   * An optimized version of {@link Sequence.each}.
   */
  ArrayWrapper.prototype.each = function(fn) {
    var i = -1;
    while (++i < this.source.length) {
      if (fn(this.source[i], i) === false) {
        break;
      }
    }
  };

  /**
   * An optimized version of {@link Sequence.map}.
   */
  ArrayWrapper.prototype.map = function(mapFn) {
    return new MappedArrayWrapper(this.source, mapFn);
  };

  /**
   * An optimized version of {@link Sequence.filter}.
   */
  ArrayWrapper.prototype.filter = function(filterFn) {
    return new FilteredArrayWrapper(this, filterFn);
  };

  /**
   * An optimized version of {@link Sequence.uniq}.
   */
  ArrayWrapper.prototype.uniq =
  ArrayWrapper.prototype.unique = function() {
    return new UniqueArrayWrapper(this);
  };

  /**
   * An optimized version of {@link Sequence.toArray}.
   */
  ArrayWrapper.prototype.toArray = function() {
    return this.source.slice(0);
  };

  /**
   * @constructor
   */
  function MappedArrayWrapper(source, mapFn) {
    this.source = source;
    this.mapFn  = mapFn;
  }

  MappedArrayWrapper.prototype = new ArrayLikeSequence();

  MappedArrayWrapper.prototype.get = function(i) {
    return this.mapFn(this.source[i]);
  };

  MappedArrayWrapper.prototype.length = function() {
    return this.source.length;
  };

  MappedArrayWrapper.prototype.each = function(fn) {
    var source = this.source,
        length = this.source.length,
        mapFn  = this.mapFn,
        i = -1;
    while (++i < length) {
      if (fn(mapFn(source[i], i), i) === false) {
        return;
      }
    }
  };

  /**
   * @constructor
   */
  function FilteredArrayWrapper(parent, filterFn) {
    this.parent   = parent;
    this.filterFn = filterFn;
  }

  FilteredArrayWrapper.prototype = new FilteredSequence();

  FilteredArrayWrapper.prototype.each = function(fn) {
    var source = this.parent.source,
        filterFn = this.filterFn,
        length = source.length,
        i = -1,
        e;

    while (++i < length) {
      e = source[i];
      if (filterFn(e, i) && fn(e, i) === false) {
        break;
      }
    }
  };

  /**
   * @constructor
   */
  function UniqueArrayWrapper(parent) {
    this.parent = parent;
    this.each = getEachForSource(parent.source);
  }

  UniqueArrayWrapper.prototype = new CachingSequence();

  UniqueArrayWrapper.prototype.eachNoCache = function(fn) {
    var source = this.parent.source,
        length = source.length,
        find   = containsBefore,
        value,

        // Yes, this is hideous.
        // Trying to get performance first, will refactor next!
        i = -1,
        k = 0;

    while (++i < length) {
      value = source[i];
      if (!find(source, value, i) && fn(value, k++) === false) {
        return false;
      }
    }
  };

  UniqueArrayWrapper.prototype.eachArrayCache = function(fn) {
    // Basically the same implementation as w/ the set, but using an array because
    // it's cheaper for smaller sequences.
    var source = this.parent.source,
        length = source.length,
        cache  = [],
        find   = contains,
        value,
        i = -1,
        j = 0;
    while (++i < length) {
      value = source[i];
      if (!find(cache, value)) {
        cache.push(value);
        if (fn(value, j++) === false) {
          return false;
        }
      }
    }
  };

  UniqueArrayWrapper.prototype.eachSetCache = UniqueSequence.prototype.each;

  // So, this is kinda shocking.
  // Soon I'll write a whole blog post about this; but for now suffice it to say
  // that going w/ a no-cache approach is the fastest solution until around 200
  // elements, at which point using an array-based cache is still faster than
  // using a set-based cache. Not until somewhere around 800 elements does a set-
  // based approach start to outpace the others.
  function getEachForSource(source) {
    if (source.length < 40) {
      return UniqueArrayWrapper.prototype.eachNoCache;
    } else if (source.length < 800) {
      return UniqueArrayWrapper.prototype.eachArrayCache;
    } else {
      return UniqueSequence.prototype.each;
    }
  }


  /**
   * An `ObjectLikeSequence` object represents a sequence of key/value pairs.
   *
   * @constructor
   */
  function ObjectLikeSequence() {}

  ObjectLikeSequence.prototype = new Sequence();

  ObjectLikeSequence.prototype.get = function(key) {
    return this.parent.get(key);
  };

  ObjectLikeSequence.prototype.keys = function() {
    return this.map(function(v, k) { return k; });
  };

  ObjectLikeSequence.prototype.values = function() {
    return this.map(function(v, k) { return v; });
  };

  ObjectLikeSequence.prototype.assign = function(other) {
    return new AssignSequence(this, other);
  };

  ObjectLikeSequence.prototype.extend = ObjectLikeSequence.prototype.assign;

  ObjectLikeSequence.prototype.defaults = function(defaults) {
    return new DefaultsSequence(this, defaults);
  };

  ObjectLikeSequence.prototype.invert = function() {
    return new InvertedSequence(this);
  };

  ObjectLikeSequence.prototype.functions = function() {
    return this
      .filter(function(v, k) { return typeof(v) === "function"; })
      .map(function(v, k) { return k; });
  };

  ObjectLikeSequence.prototype.methods = ObjectLikeSequence.prototype.functions;

  ObjectLikeSequence.prototype.pick = function(properties) {
    return new PickSequence(this, properties);
  };

  ObjectLikeSequence.prototype.omit = function(properties) {
    return new OmitSequence(this, properties);
  };

  ObjectLikeSequence.prototype.toArray = function() {
    return this.map(function(v, k) { return [k, v]; }).toArray();
  };

  ObjectLikeSequence.prototype.pairs = ObjectLikeSequence.prototype.toArray;

  ObjectLikeSequence.prototype.toObject = function() {
    return this.map(function(v, k) { return [k, v]; }).toObject();
  };

  /**
   * @constructor
   */
  function AssignSequence(parent, other) {
    this.parent = parent;
    this.other  = other;
  }

  AssignSequence.prototype = new ObjectLikeSequence();

  AssignSequence.prototype.each = function(fn) {
    var merged = new Set(),
        done   = false;

    Lazy(this.other).each(function(value, key) {
      if (fn(value, key) === false) {
        done = true;
        return false;
      }

      merged.add(key);
    });

    if (!done) {
      this.parent.each(function(value, key) {
        if (!merged.contains(key) && fn(value, key) === false) {
          return false;
        }
      });
    }
  };

  /**
   * @constructor
   */
  function DefaultsSequence(parent, defaults) {
    this.parent   = parent;
    this.defaults = defaults;
  }

  DefaultsSequence.prototype = new ObjectLikeSequence();

  DefaultsSequence.prototype.each = function(fn) {
    var merged = new Set(),
        done   = false;

    this.parent.each(function(value, key) {
      if (fn(value, key) === false) {
        done = true;
        return false;
      }

      if (typeof value !== "undefined") {
        merged.add(key);
      }
    });

    if (!done) {
      Lazy(this.defaults).each(function(value, key) {
        if (!merged.contains(key) && fn(value, key) === false) {
          return false;
        }
      });
    }
  };

  /**
   * @constructor
   */
  function InvertedSequence(parent) {
    this.parent = parent;
  }

  InvertedSequence.prototype = new ObjectLikeSequence();

  InvertedSequence.prototype.each = function(fn) {
    this.parent.each(function(value, key) {
      return fn(key, value);
    });
  };

  /**
   * @constructor
   */
  function PickSequence(parent, properties) {
    this.parent     = parent;
    this.properties = properties;
  }

  PickSequence.prototype = new ObjectLikeSequence();

  PickSequence.prototype.each = function(fn) {
    var inArray    = contains,
        properties = this.properties;

    this.parent.each(function(value, key) {
      if (inArray(properties, key)) {
        return fn(value, key);
      }
    });
  };

  /**
   * @constructor
   */
  function OmitSequence(parent, properties) {
    this.parent     = parent;
    this.properties = properties;
  }

  OmitSequence.prototype = new ObjectLikeSequence();

  OmitSequence.prototype.each = function(fn) {
    var inArray    = contains,
        properties = this.properties;

    this.parent.each(function(value, key) {
      if (!inArray(properties, key)) {
        return fn(value, key);
      }
    });
  };

  /**
   * @constructor
   */
  function ObjectWrapper(source) {
    this.source = source;
  }

  ObjectWrapper.prototype = new ObjectLikeSequence();

  ObjectWrapper.prototype.get = function(key) {
    return this.source[key];
  };

  ObjectWrapper.prototype.each = function(fn) {
    var source = this.source,
        key;

    for (key in source) {
      if (fn(source[key], key) === false) {
        return;
      }
    }
  };

  /**
   * A `StringLikeSequence` represents a sequence of characters.
   *
   * TODO: The idea for this prototype is to be able to do things like represent
   * "substrings" without actually allocating new strings. Right now that
   * isn't implemented at all, though (every method assumes an actual string as
   * `source`).
   *
   * @constructor
   */
  function StringLikeSequence() {}

  StringLikeSequence.prototype = new ArrayLikeSequence();

  StringLikeSequence.prototype.getIterator = function() {
    return new CharIterator(this.source);
  };

  StringLikeSequence.prototype.charAt = function(i) {
    return this.get(i);
  };

  StringLikeSequence.prototype.each = function(fn) {
    var source = this.source,
        length = source.length,
        i = -1;

    while (++i < length) {
      if (fn(source.charAt(i)) === false) {
        break;
      }
    }
  };

  /**
   * Creates a sequence comprising all of the matches for the specified pattern
   * in the underlying string.
   *
   * @param {RegExp} pattern The pattern to match.
   * @return {Sequence} A sequence of all the matches.
   */
  StringLikeSequence.prototype.match = function(pattern) {
    return new StringMatchSequence(this.source, pattern);
  };

  /**
   * Creates a sequence comprising all of the substrings of this string separated
   * by the given delimiter, which can be either a string or a regular expression.
   *
   * @param {string|RegExp} delimiter The delimiter to use for recognizing
   *     substrings.
   * @return {Sequence} A sequence of all the substrings separated by the given
   *     delimiter.
   */
  StringLikeSequence.prototype.split = function(delimiter) {
    return new SplitStringSequence(this.source, delimiter);
  };

  var StringMatchSequence = Sequence.inherit(function(source, pattern) {
    this.source = source;
    this.pattern = pattern;
  });

  StringMatchSequence.prototype.each = function(fn) {
    var iterator = this.getIterator();
    while (iterator.moveNext()) {
      if (fn(iterator.current()) === false) {
        return;
      }
    }
  };

  StringMatchSequence.prototype.getIterator = function() {
    return new StringMatchIterator(this.source, this.pattern);
  };

  var SplitStringSequence = Sequence.inherit(function(source, pattern) {
    this.source = source;
    this.pattern = pattern;
  });

  SplitStringSequence.prototype.each = function(fn) {
    var iterator = this.getIterator();
    while (iterator.moveNext()) {
      if (fn(iterator.current()) === false) {
        break;
      }
    }
  };

  SplitStringSequence.prototype.getIterator = function() {
    if (this.pattern instanceof RegExp) {
      if (this.pattern.source === "" || this.pattern.source === "(?:)") {
        return new CharIterator(this.source);
      } else {
        return new SplitWithRegExpIterator(this.source, this.pattern);
      }
    } else if (this.pattern === "") {
      return new CharIterator(this.source);
    } else {
      return new SplitWithStringIterator(this.source, this.pattern);
    }
  };

  /**
   * Wraps a string exposing {@link match} and {@link split} methods that return
   * {@link Sequence} objects instead of arrays, improving on the efficiency of
   * JavaScript's built-in {@link String.split} and {@link String.match} methods
   * and supporting asynchronous iteration.
   *
   * @param {string} source The string to wrap.
   * @constructor
   */
  function StringWrapper(source) {
    this.source = source;
  }

  StringWrapper.prototype = new StringLikeSequence();

  StringWrapper.prototype.get = function(i) {
    return this.source.charAt(i);
  };

  StringWrapper.prototype.length = function() {
    return this.source.length;
  };

  /**
   * A GeneratedSequence does not wrap an in-memory colllection but rather
   * determines its elements on-the-fly during iteration according to a generator
   * function.
   *
   * @constructor
   * @param {function(number, *):*} generatorFn A function which accepts an index
   *     and returns a value for the element at that position in the sequence.
   * @param {number=} length The length of the sequence. If this argument is
   *     omitted, the sequence will go on forever.
   */
  function GeneratedSequence(generatorFn, length) {
    this.get = generatorFn;
    this.fixedLength = length;
  }

  GeneratedSequence.prototype = new Sequence();

  /**
   * Returns the length of this sequence.
   *
   * @return {number} The length, or undefined if this is an indefinite sequence.
   */
  GeneratedSequence.prototype.length = function() {
    return this.fixedLength;
  };

  /**
   * See {@link Sequence.each}.
   */
  GeneratedSequence.prototype.each = function(fn) {
    var generatorFn = this.get,
        length = this.fixedLength,
        i = 0;
    while (typeof length === "undefined" || i < length) {
      if (fn(generatorFn(i++)) === false) {
        break;
      }
    }
  };

  /**
   * An AsyncSequence iterates over its elements asynchronously when {@link each}
   * is called.
   *
   * @param {Sequence} parent A {@link Sequence} to wrap, to expose asynchronous
   *     iteration.
   * @param {number=} interval How many milliseconds should elapse between each
   *     element when iterating over this sequence. If this argument is omitted,
   *     asynchronous iteration will be executed as fast as possible.
   * @constructor
   */
  function AsyncSequence(parent, interval) {
    if (parent instanceof AsyncSequence) {
      throw "Sequence is already asynchronous!";
    }

    this.parent = parent;
    this.onNextCallback = getOnNextCallback(interval);
  }

  AsyncSequence.prototype = new Sequence();

  /**
   * An asynchronous version of {@link Sequence.each}.
   */
  AsyncSequence.prototype.each = function(fn) {
    var iterator = this.parent.getIterator(),
        onNextCallback = this.onNextCallback;

    if (iterator.moveNext()) {
      onNextCallback(function iterate() {
        if (fn(iterator.current()) !== false && iterator.moveNext()) {
          onNextCallback(iterate);
        }
      });
    }
  };

  function getOnNextCallback(interval) {
    if (typeof interval === "undefined") {
      if (typeof context.setImmediate === "function") {
        return context.setImmediate;
      }
      if (typeof process !== "undefined" && typeof process.nextTick === "function") {
        return process.nextTick;
      }
    }

    interval = interval || 0;
    return function(fn) {
      setTimeout(fn, interval);
    };
  }

  /**
   * A StreamLikeSequence comprises a sequence of 'chunks' of data, which are
   * typically multiline strings.
   *
   * @constructor
   */
  function StreamLikeSequence() {}

  StreamLikeSequence.prototype = new Sequence();

  StreamLikeSequence.prototype.lines = function() {
    return new LinesSequence(this);
  };

  /**
   * A sequence of lines (segments of a larger string or string-like sequence
   * delimited by line breaks).
   *
   * @constructor
   */
  function LinesSequence(parent) {
    this.parent = parent;
  };

  LinesSequence.prototype = new Sequence();

  LinesSequence.prototype.each = function(fn) {
    var done = false;
    this.parent.each(function(chunk) {
      Lazy(chunk).split("\n").each(function(line) {
        if (fn(line) === false) {
          done = true;
          return false;
        }
      });

      return !done;
    });
  };

  /**
   * A StreamingHttpSequence is a `StreamLikeSequence` comprising the chunks of
   * data that are streamed in response to an HTTP request.
   *
   * @param {string} url The URL of the HTTP request.
   * @constructor
   */
  function StreamingHttpSequence(url) {
    this.url = url;
  };

  StreamingHttpSequence.prototype = new StreamLikeSequence();

  StreamingHttpSequence.prototype.each = function(fn) {
    var request = new XMLHttpRequest(),
        index   = 0,
        aborted = false;

    request.open("GET", this.url);

    var listener = function(data) {
      if (!aborted) {
        data = request.responseText.substring(index);
        if (fn(data) === false) {
          request.removeEventListener("progress", listener, false);
          request.abort();
          aborted = true;
        }
        index += data.length;
      }
    };

    request.addEventListener("progress", listener, false);

    request.send();
  };

  /**
   * Wraps an object and returns something lazy.
   *
   * - For **arrays**, Lazy will create a sequence comprising the elements in
   *   the array.
   * - For **objects**, Lazy will create a sequence of key/value pairs.
   * - For **strings**, Lazy will create a sequence of characters.
   *
   * @param {*} source An array, object, or string to wrap.
   * @return {Sequence} The wrapped lazy object.
   *
   * @example
   * var fromArray = Lazy([1, 2, 4]);
   * // => Lazy.ArrayLikeSequence
   *
   * var fromObject = Lazy({ foo: "bar" });
   * // => Lazy.ObjectLikeSequence
   *
   * var fromString = Lazy("hello, world!");
   * // => Lazy.StringLikeSequence
   */
  var Lazy = function(source) {
    if (source instanceof Sequence) {
      return source;
    } else if (typeof source === "string") {
      return new StringWrapper(source);
    } else if (source instanceof Array) {
      return new ArrayWrapper(source);
    }
    return new ObjectWrapper(source);
  };

  /**
   * Creates a {@link GeneratedSequence} using the specified generator function
   * and (optionally) length.
   *
   * @param {function(number):*} generatorFn The function used to generate the
   *     sequence. This function accepts an index as a parameter and should return
   *     a value for that index in the resulting sequence.
   * @param {number=} length The length of the sequence, for sequences with a
   *     definite length.
   * @return {GeneratedSequence} The generated sequence.
   *
   * @example
   * var randomNumbers = Lazy.generate(Math.random);
   * // => sequence: (0.4838115070015192, 0.637410914292559, ...)
   *
   * randomNumbers.length();
   * // => undefined
   *
   * var countingNumbers = Lazy.generate(function(i) { return i + 1; }, 10);
   * // => sequence: (1, 2, ..., 10)
   *
   * countingNumbers.length();
   * // => 10
   */
  Lazy.generate = function(generatorFn, length) {
    return new GeneratedSequence(generatorFn, length);
  };

  /**
   * Creates a sequence from a given starting value, up to a specified stopping
   * value, incrementing by a given step.
   *
   * @return {GeneratedSequence} The sequence defined by the given ranges.
   *
   * @example
   * var integers = Lazy.range(10);
   * // => sequence: (0, 1, ..., 9)
   *
   * var countingNumbers = Lazy.range(1, 11);
   * // => sequence: (1, 2, ..., 10)
   *
   * var evenNumbers = Lazy.range(2, 10, 2);
   * // => sequence: (2, 4, 6, 8)
   */
  Lazy.range = function() {
    var start = arguments.length > 1 ? arguments[0] : 0,
        stop  = arguments.length > 1 ? arguments[1] : arguments[0],
        step  = arguments.length > 2 ? arguments[2] : 1;
    return this.generate(function(i) { return start + (step * i); })
      .take(Math.floor((stop - start) / step));
  };

  /**
   * Creates a sequence consisting of the given value repeated a specified number
   * of times.
   *
   * @param {*} value The value to repeat.
   * @param {number=} count The number of times the value should be repeated in
   *     the sequence. If this argument is omitted, the value will repeat forever.
   * @return {GeneratedSequence} The sequence containing the repeated value.
   *
   * @example
   * var hihihi = Lazy.repeat("hi", 3);
   * // => sequence: ("hi", "hi", "hi")
   */
  Lazy.repeat = function(value, count) {
    return Lazy.generate(function() { return value; }, count);
  };

  Lazy.Sequence = Sequence;
  Lazy.ArrayLikeSequence = ArrayLikeSequence;
  Lazy.ObjectLikeSequence = ObjectLikeSequence;
  Lazy.StringLikeSequence = StringLikeSequence;
  Lazy.GeneratedSequence = GeneratedSequence;
  Lazy.AsyncSequence = AsyncSequence;

  /*** Useful utility methods ***/

  /**
   * Creates a Set containing the specified values.
   *
   * @param {...*} values One or more values (or array(s) of values) used to
   *     populate the set.
   * @return {Set} A new set containing the values passed in.
   */
  function createSet(values) {
    var set = new Set();
    Lazy(values || []).flatten().each(function(e) {
      set.add(e);
    });
    return set;
  };

  /**
   * Compares two elements for sorting purposes.
   *
   * @param {*} x The left element to compare.
   * @param {*} y The right element to compare.
   * @param {Function=} fn An optional function to call on each element, to get
   *     the values to compare.
   * @return {number} 1 if x > y, -1 if x < y, or 0 if x and y are equal.
   */
  function compare(x, y, fn) {
    if (typeof fn === "function") {
      return compare(fn(x), fn(y));
    }

    if (x === y) {
      return 0;
    }

    return x > y ? 1 : -1;
  }

  /**
   * Iterates over every individual element in an array of arrays (of arrays...).
   *
   * @param {Array} array The outermost array.
   * @param {Function} fn The function to call on every element, which can return
   *     false to stop the iteration early.
   * @param {Array=} index An optional counter container, to keep track of the
   *     current index.
   * @return {boolean} True if every element in the entire sequence was iterated,
   *     otherwise false.
   */
  function recursiveForEach(array, fn, index) {
    // It's easier to ensure this is initialized than to add special handling
    // in case it isn't.
    index = index || [0];

    var i = -1;
    while (++i < array.length) {
      if (array[i] instanceof Array) {
        if (recursiveForEach(array[i], fn, index) === false) {
          return false;
        }
      } else {
        if (fn(array[i], index[0]++) === false) {
          return false;
        }
      }
    }
    return true;
  }

  function getFirst(sequence) {
    var result;
    sequence.each(function(e) {
      result = e;
      return false;
    });
    return result;
  }

  function contains(array, element) {
    var i = -1,
        length = array.length;

    while (++i < length) {
      if (array[i] === element) {
        return true;
      }
    }
    return false;
  }

  function containsBefore(array, element, index) {
    var i = -1;

    while (++i < index) {
      if (array[i] === element) {
        return true;
      }
    }
    return false;
  }

  function swap(array, i, j) {
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  function indent(depth) {
    return new Array(depth).join("  ");
  }

  /**
   * A collection of unique elements.
   *
   * @constructor
   */
  function Set() {
    this.table = {};
  }

  /**
   * Attempts to add a unique value to the set.
   *
   * @param {*} value The value to add.
   * @return {boolean} True if the value was added to the set (meaning an equal
   *     value was not already present), or else false.
   */
  Set.prototype.add = function(value) {
    var table  = this.table,
        key    = typeof value,
        values = table[key];

    if (!values) {
      values = table[key] = [value];
      return true;
    }
    if (contains(values, value)) {
      return false;
    }
    values.push(value);
    return true;
  };

  /**
   * Checks whether the set contains a value.
   *
   * @param {*} value The value to check for.
   * @return {boolean} True if the set contains the value, or else false.
   */
  Set.prototype.contains = function(value) {
    var key = typeof value,
        values = this.table[key];
    return values && contains(values, value);
  };

  /*** Exposing Lazy to the world ***/

  // For Node.js
  if (typeof module !== "undefined") {
    module.exports = Lazy;

  // For browsers
  } else {
    context.Lazy = Lazy;
  }

}(typeof global !== "undefined" ? global : window));