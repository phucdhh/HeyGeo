#!/usr/bin/env python

#
# Process a WSP JSON file to remove objects that have no visible impact on the sketch
# Basically, if an object is visible, then it, and any ancestor of it, are deemed to 
# have an impact. Note that it's possible this will remove objects that might be shown / queried by
# sQuery, which is not determinable from the JSON alone.
#
# While here, we also remove any debug information from the JSON
#
# Output is non-pretty-printed JSON
#

import json
import decimal
import sys
import collections
from toposort import *

# json module custom float parser that preserves original input precision, rather
# than introducing rounding error.

# Globals
# We'll track tools that assume that look for gobjects by label
assumedNames = set()

# We'll track whether we need to keep[ all coordinate systems (e.g. if a tool assumes it)
preserveAllCoordSys = False

# We want to return the float in it's string format minus the quotes.
class pseudofloat(float):
    def __init__(self, value):
        self._value = value
    def __repr__(self):
        return str(self._value)

# Tells the json.dumps how to serialize properties with a Decimal object as value, otherwise
# it will not parse and dump Decimal objects as Decimal(0.123) instead of 0.123
def decimal_default(obj):
    if isinstance(obj, decimal.Decimal):
        return pseudofloat(obj)
    raise TypeError(repr(o) + " is not JSON serializable")


# Utilities to manipulate the sketch object graph
# map gobjId -> set of Id's of parents    
def createParentMap(pageObjects):
    data = {}
    for k in pageObjects:
        v = pageObjects[k]
        data[k] = set()
        if(v.get('parents')):
            for parent in v['parents']:
                data[k].add( v['parents'][parent])
    return data

# Create the topologically ordered constraint list        
def createConstraintList(data):
    return toposort_flatten(data)

# Create a reverse mapping GobjId -> set of Id's of children
def createChildMap(parentMap):
    children = {}
    for k in parentMap:
        parents = parentMap[k]
        for p in parents:
           if( not children.get(p)):
               children[p] = set();
           children[p].add(k) 
    return children
 
# Test an object - are we keeping it?    
def shouldKeep(obj, id, childMap, preserveCoordSys, keep):
    #if it's visible, yes. Assume it's visible unless proven otherwise.
    if( not 'style' in obj):
        return True

    if( preserveCoordSys and obj.get('genus') == 'CoordSys'):
        return True
    
    if( obj.get('style')):
        style = obj['style']
        if((not 'hidden' in style) or (not style['hidden']) ):
            return True

    # If it might match a tools assumed, keep it
    if( obj.get('label')):
        if( obj.get('label') in assumedNames):
            return True

    # If we've already determined to keep a child, then yes for us too
    children = childMap.get(id)
    if( children):
        for c in children:
            if c in keep:
                return True
    return False
   
# Remove unneeded objects from a page    
def prunePageObjects(pageObjects, preserveCoordSys):
    parentMap = createParentMap(pageObjects)
    childMap = createChildMap(parentMap)
    constraintList = createConstraintList(parentMap)
    keep = set()
    for k in reversed(constraintList):
        obj = pageObjects[k]
        if(shouldKeep(obj, k, childMap, preserveCoordSys, keep)):
            keep.add(k)
    for k in constraintList:
        if(not k in keep):
            del pageObjects[k]

# Go over the page objects, removing grot.
def cleanPageobjects(pageObjects, preserveCoordSys):
    prunePageObjects(pageObjects, preserveCoordSys)
    for object in pageObjects:
        if pageObjects[object].get('debug'):
            del pageObjects[object]['debug'] 

def findToolAssumeds(tool):
    global preserveAllCoordSys
    for object in tool:
        if tool[object].get('toolRole') == 'assumed':
            if(tool[object].get('genus') == 'CoordSys'):
                preserveAllCoordSys = True
            else:
                assumedNames.add(tool[object].get('label'))

# main()
# Grab json
jsonfilepath = sys.argv[1]
jsondata = open(jsonfilepath)
jsonobj = json.loads(jsondata.read(), parse_float=decimal.Decimal, object_pairs_hook=collections.OrderedDict)
jsondata.close()


if (jsonobj.get('tools')):
    for tool in jsonobj['tools']:
        if tool.get('objects'):
            findToolAssumeds(tool['objects'])

# For each page, clean up the page
for page in jsonobj['pages']:
    if page.get('objects'):
        prefs = page.get('preferences')
        cleanPageobjects(page['objects'], preserveAllCoordSys or (prefs and prefs.get('snapToGrid')))

# Clean up metadata
if jsonobj.get('metadata') and jsonobj['metadata'].get('exporter-debug'):
    del jsonobj['metadata']['exporter-debug'];

# Print resulting JSON to stdout
print json.dumps(jsonobj, default=decimal_default, separators=(',',':'), encoding='utf-8')

