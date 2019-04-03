function Vue(options={}){
    this.$options=options;
    //将所有属性挂载在$options;
    //this._data
    let data=this._data=this.$options.data;
    //观察data对象，将每一项做一个数据劫持；就是将data中每一项用Object.defineProperty定义新属性并返回这个对象。
    observe(data);
    //this 代理this._data;
    for(let key in data){
        Object.defineProperty(this,key,{
            enumerable:true,
            get(){
                return this._data[key]; //相当于 this.a={a:1}
            },
            set(newVal){ //如果直接更改this[key]='XXX',那么this._data[key]的值是不会被同步改变的。
                // 我们可以通过给this._data[key]=value赋值，从而调取Observe方法中的set，赋予this._data[key]新值。
                // get(){return this._data[key]},获取到的值即是调取Observe方法中get方法return的值
                // 也就是根源上的改变是this._data[key];这样不管是this._data[key]还是this[key]随便哪一个被赋予新值，两者都是同步变化的
                this._data[key]=newVal;
            }
        })
    }
    initComputed.call(this);
    new Compile(options.el,this)
}
function initComputed(){
    let vm=this;
    let computed=this.$options.computed; //Object.keys [name:'tom',age:2]=>[name,age]
    Object.keys(computed).forEach(function(key){
        Object.defineProperty(vm,key,{ //computed[key]
            get:typeof computed[key]==='function'? computed[key]:computed[key].get,
            set(){

            }
        })
    })
}

function Compile(el,vm){
    //el代表替换的范围
    let replacePart=document.querySelector(el);
    let fragment=document.createDocumentFragment();
    while(child = replacePart.firstChild){ //将app中的内容移至内存中
        fragment.appendChild(child);
    }
    replace(fragment) //我们在此要做的是通过replace方法，将代码片段中的{{a.a}}的a.a替换为data中对应的值。
    replacePart.appendChild(fragment);
    function replace(fragment){
        Array.from(fragment.childNodes).forEach(function(node){
            let text=node.textContent;
            let reg=/\{\{(.*)\}\}/;
            if(node.nodeType===3&&reg.test(text)){ //nodeType:3 文本节点
                let arr=RegExp.$1.split('.') // [A] [a,a] [b] ...
                let val=vm; //val:{a:{a:1}}
                arr.forEach(function(k){
                    val=val[k]  //举例 第一次循环  val=val.a   val赋值后val:{a:1} ;第二次循环  val=val.a  val赋值后为1
                })
                new Watcher(vm,RegExp.$1,function(newValue){ //订阅的事件  函数里需要接受新的值
                    node.textContent=text.replace(reg,newValue);
                });
                node.textContent=text.replace(reg,val)
            }
            if(node.nodeType===1){
                //元素节点
                let nodeAttrs=node.attributes; //获取当前dom节点的属性
                Array.from(nodeAttrs).forEach(function(attr){
                    let name=attr.name; //v-model
                    let exp=attr.value; // s
                    if(name.indexOf('v-model')==0){ //v-model
                        node.value=vm[exp];
                    }
                    new Watcher(vm,exp,function(newVal){
                        node.value=newVal; //当watcher触发时会自动将内容放到输入框内
                    })
                    node.addEventListener('input',function(e){
                        let newVal=e.target.value;
                        vm[exp]=newVal;  //这一步会触发 set方法，同时触发 notify方法
                    })
                })
            }
            if(node.childNodes){
                replace(node)  //如果当前node存在子节点，递归替换
            }
        })
    }
}

function Observe(data) { //这里写的是主要逻辑
    let dep=new Dep();
    for(let key in data){ //把data属性通过object.defineProperty的方式 定义属性
        let val=data[key];
        observe(val); //递归 劫持
        Object.defineProperty(data,key,{
            enumerable:true, //可以枚举
            get(){
                Dep.target&&dep.addSub(Dep.target);
                return val; //仅仅是将以前的 a:1的方式 转变成defineProperty的方式
            },
            set(newValue){ //更改值的时候触发
                if(newValue===val){ //如果设置的值跟之前的值一样则什么也不做
                    return;
                }
                val=newValue; //将新值赋给val,那么get获取val的时候,获取的就是newValue;
                observe(newValue)
                dep.notify(); //让所有watcher的update方法执行即可
            }
        })
    }
}
//观察对象给对象增加ObjectDefinedProperty
function observe(data){
    if(typeof data!='object'){
        return;
    }
    return new Observe(data);
}
//发布订阅模式
function Dep(){
    this.subs=[]
}
Dep.prototype.addSub=function(sub){ //订阅
    this.subs.push(sub)
}
Dep.prototype.notify=function(){
    this.subs.forEach(sub=>{
        sub.update();
    })
}
function Watcher(vm,exp,fn){
    this.fn=fn;
    this.vm=vm;
    this.exp=exp;
    //我们要将fn添加到订阅中
    Dep.target=this;
    let val=vm;
    let arr=exp.split('.');
    arr.forEach(function(k){
        val=val[k];
    })
    Dep.target=null;
}
Watcher.prototype.update=function(){
    let val=this.vm;
    let arr=this.exp.split('.');
    arr.forEach(function(k){ //this.a.a
        val=val[k];
    })
    this.fn(val); //newValue
}