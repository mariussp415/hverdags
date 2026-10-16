import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIngredients,normalizedGroceryName} from '../lib/shopping.mjs';

test('ingredients support Norwegian decimal amounts, units and plain counts',()=>{
  assert.deepEqual(parseIngredients('500 g pasta\n1,5 l melk\n2 egg\n- 1 pk smør'),[
    {name:'pasta',quantity:500,unit:'g'}, {name:'melk',quantity:1.5,unit:'l'},
    {name:'egg',quantity:2,unit:'stk'}, {name:'smør',quantity:1,unit:'pk'},
  ]);
});
test('uncertain ingredient amounts are retained for manual review',()=>{
  assert.deepEqual(parseIngredients('1/2 løk\nSalt etter smak\n\n0 g mel').map(x=>x.name),['1/2 løk','Salt etter smak','0 g mel']);
});
test('duplicate names ignore case and repeated whitespace but not distinct products',()=>{
  assert.equal(normalizedGroceryName('  Lett   MELK '),normalizedGroceryName('lett melk'));
  assert.notEqual(normalizedGroceryName('melk'),normalizedGroceryName('lettmelk'));
});
