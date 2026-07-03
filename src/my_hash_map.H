#ifndef MY_HASH_MAP_H
#define MY_HASH_MAP_H

// Include QString first so Qt can register std::hash<QString> before instantiation
#include <QString>
#include <unordered_map>

#ifdef HASH_NAMESPACE
#undef HASH_NAMESPACE
#endif

#define HASH_NAMESPACE std
using std::unordered_map;
template<typename K, typename V> using hash_map = std::unordered_map<K, V>;

#endif // MY_HASH_MAP_H
