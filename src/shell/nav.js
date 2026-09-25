const items=['Profile','Trade','Map','Shop','Alliance'];
export function nav(active='Profile'){return `<nav>${items.map(x=>`<button data-screen="${x.toLowerCase()}" class="${x===active?'active':''}">${x}</button>`).join('')}</nav>`}
