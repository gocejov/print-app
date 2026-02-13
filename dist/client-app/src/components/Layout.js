"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_router_dom_1 = require("react-router-dom");
const Layout = () => {
    return (React.createElement(React.Fragment, null,
        React.createElement("nav", null,
            React.createElement("ul", null,
                React.createElement("li", null,
                    React.createElement(react_router_dom_1.Link, { to: "/" }, "Home")),
                React.createElement("li", null,
                    React.createElement(react_router_dom_1.Link, { to: "/players" }, "Players")),
                React.createElement("li", null,
                    React.createElement(react_router_dom_1.Link, { to: "/teams" }, "Teams")))),
        React.createElement(react_router_dom_1.Outlet, null)));
};
exports.default = Layout;
