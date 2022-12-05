/**
 * @type {import('postcss').PluginCreator}
 */
const defaultBreakpoints = [
	{
		prefix: "xs-",
		mediaQuery: "(max-width: 40em)",
	},
	{
		prefix: "sm-",
		mediaQuery: "(min-width: 40em)",
	},
	{
		prefix: "md-",
		mediaQuery: "(min-width: 52em)",
	},
	{
		prefix: "lg-",
		mediaQuery: "(min-width: 64em)",
	},
];

function checkForOptionsBreakpoints(breakpoints) {
	if (breakpoints && !Array.isArray(breakpoints)) {
		throw new Error("Breakpoints must be an array");
	}
	if (breakpoints && breakpoints.length === 0) {
		throw new Error("Breakpoints must not be empty");
	}
}

module.exports = (opts = {}) => {
	// Work with options here
	if (opts && opts.breakpoints) {
		checkForOptionsBreakpoints(opts.breakpoints);
	}

	const breakpoints = opts.breakpoints || defaultBreakpoints;

	return {
		postcssPlugin: "postcss-responsify",
		AtRule: {
			responsive: (atRule, { AtRule }) => {
				const nodes = atRule.nodes;
				const parent = atRule.parent;

				//add breakpoints to the parent (root) node
				const newBreakPoints = breakpoints.map((breakpoint) => {
					let newAtRule;
					const { mediaQuery, prefix } = breakpoint;

					// if mediaquery exist assign it to the newAtRule else create a new one from breakpoints
					parent.walkAtRules("media", (rule) => {
						if (rule.params !== mediaQuery) {
							return;
						}
						newAtRule = rule;
					});
					if (!newAtRule) {
						newAtRule = new AtRule({
							name: "media",
							params: mediaQuery,
						});
					}

					// copy the nodes to the newAtRule
					if (newAtRule.params === mediaQuery) {
						atRule.walk((node) => {
							// check if selector is valid. Only want class selectors
							const isValidSelector =
								node.selector && node.selector.charAt(0) === ".";
							if (!isValidSelector) {
								return;
							}

							//clone the node and add the prefix to the selector
							const clonedNode = node.clone();

							// if the selector is a comma separated list of selectors split into array and checkt if prefixed
							const selectors = clonedNode.selector
								.replace(/\n\t/g, "")
								.split(",");
							const prefixLength = prefix.length;
							const selectorStart = clonedNode.selector.slice(
								1,
								prefixLength + 1
							);
							const isAlreadyPrefixed = selectorStart === prefix;
							if (isAlreadyPrefixed) {
								return false;
							}

							const selectorArray = [];
							selectors.forEach((s, index) => {
								const sel = s.trim();
								if (sel[0] !== ".") {
									return;
								}
								let newLine = "";
								if (index > 0) {
									newLine = "\n";
								}
								selectorArray.push(`${newLine}.${prefix}${sel.slice(1)}`);
							});
							clonedNode.selector = selectorArray.toString();
							newAtRule.append(clonedNode);
						});
					}
					return newAtRule;
				});
				newBreakPoints.forEach((n) => parent.append(n));
				atRule.replaceWith(nodes);
			},
		},
	};
};

module.exports.postcss = true;
