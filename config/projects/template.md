
## 图片渲染

<%= await module$base_renderImage({type:"md",alt:"test",href:"https://github.com/douxiba.png"}) %>

## 图片渲染（size:1.25x）

<%= await module$base_renderImage({type:"md",alt:"test",href:"https://github.com/douxiba.png",size:"1.25x"}) %>

## 图片渲染（size:0.5x）

<%= await module$base_renderImage({type:"md",alt:"test",href:"https://github.com/douxiba.png",size:"0.5x"}) %>

## 图片渲染（preprocess）

<%= await module$base_renderImage({type:"md",alt:"test",href:"https://github.com/douxiba.png",preprocess:{mask:"circle"}}) %>
<%= await module$base_renderImage({type:"md",alt:"test",href:"https://github.com/douxiba.png",preprocess:{mask:"star"}}) %>
<%= await module$base_renderImage({type:"md",alt:"test",href:"https://github.com/HelloWRC.png",preprocess:{width:64}}) %>
