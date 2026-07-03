#ifndef MY_HASH_SET_H
#define MY_HASH_SET_H

#include <unordered_set>

#ifdef HASH_NAMESPACE
#undef HASH_NAMESPACE
#endif

#define HASH_NAMESPACE std
using std::unordered_set;
template<typename T> using hash_set = std::unordered_set<T>;

#endif //MY_HASH_SET_H
